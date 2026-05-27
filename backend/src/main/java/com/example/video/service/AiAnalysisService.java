package com.example.video.service;

import com.example.video.model.*;
import com.example.video.repository.*;
import com.google.cloud.videointelligence.v1.*;
import com.google.protobuf.ByteString;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.time.LocalDateTime;
import java.util.*;

/**
 * Dịch vụ phân tích video bằng AI (Google Video Intelligence API).
 *
 * <p>Khi người dùng tải video lên thành công, {@code VideoController.uploadVideo()}
 * sẽ gọi {@link #analyzeVideo(UUID)} bất đồng bộ (annotation {@link Async}).
 * Dịch vụ này thực hiện:</p>
 * <ol>
 *   <li>Tạo bản ghi {@link AiAnalysisJob} với trạng thái {@code processing}.</li>
 *   <li>Gửi video đến Google Video Intelligence để nhận:
 *     <ul>
 *       <li><b>Shot Change Detection</b> – phát hiện thay đổi cảnh.</li>
 *       <li><b>Label Detection</b> – gán nhãn nội dung kèm điểm tin cậy.</li>
 *     </ul>
 *   </li>
 *   <li>Lưu cảnh ({@code video_scenes}) và tag ({@code scene_tags} với {@code source='ai'}).</li>
 *   <li>Tổng hợp tag ở mức video ({@code video_tags}).</li>
 *   <li>Chuyển video sang {@code active} (hiển thị trên feed) và tạo bản ghi
 *       {@link ModerationQueue} với mức ưu tiên {@code normal} để moderator review sau.</li>
 * </ol>
 *
 * <p><b>Chế độ Mock:</b> Khi {@code video-ai.enabled=false} (mặc định) hoặc client Google
 * không khả dụng, hệ thống chạy ở chế độ mock: tạo 1 cảnh duy nhất với tag "Unclassified".
 * Điều này phục vụ phát triển và demo mà không tốn chi phí Google Cloud.</p>
 *
 * <p><b>Tác giả phụ trách:</b> Hoàng Sơn Lâm (B22DCCN477)</p>
 *
 * @see <a href="https://cloud.google.com/video-intelligence/docs">Google Video Intelligence API</a>
 */
@Service
public class AiAnalysisService {

    private static final Logger logger = LoggerFactory.getLogger(AiAnalysisService.class);

    /**
     * Kích thước tối đa cho phép gửi inline qua API (50 MB).
     * Video lớn hơn ngưỡng này sẽ bị reject ngay để tránh OOM và lỗi gRPC.
     * Để hỗ trợ video lớn cần chuyển sang Google Cloud Storage URI thay vì inline bytes.
     */
    private static final long MAX_INLINE_AI_FILE_SIZE_BYTES = 50L * 1024L * 1024L;

    /**
     * Bật/tắt phân tích AI thực tế.
     * Cấu hình trong {@code application.yml}: {@code video-ai.enabled: true|false}.
     */
    @Value("${video-ai.enabled:false}")
    private boolean aiEnabled;

    @Autowired
    private VideoRepository videoRepository;

    @Autowired
    private AiAnalysisJobRepository jobRepository;

    @Autowired
    private VideoSceneRepository sceneRepository;

    @Autowired
    private SceneTagRepository sceneTagRepository;

    @Autowired
    private VideoTagRepository videoTagRepository;

    @Autowired
    private TagService tagService;

    @Autowired
    private MinioService minioService;

    @Autowired
    private ModerationQueueRepository queueRepository;

    /**
     * Client Google Video Intelligence được Spring inject từ bean cấu hình.
     * Có thể là null nếu credentials không được thiết lập — khi đó dịch vụ chạy ở chế độ mock.
     */
    @Autowired(required = false)
    private VideoIntelligenceServiceClient videoAiClient;

    /**
     * Phương thức bất đồng bộ (entry point) phân tích video.
     *
     * <p>Được gọi sau khi upload thành công. Toàn bộ logic chạy trong một thread riêng
     * (do {@link Async}) nên không chặn phản hồi HTTP gửi về người dùng.</p>
     *
     * <p>Nếu phân tích thất bại (Google API lỗi, video quá lớn, network timeout...),
     * dịch vụ vẫn cho video lên feed ({@code active}) và đẩy vào hàng chờ moderator,
     * đảm bảo trải nghiệm người dùng không bị ảnh hưởng bởi lỗi AI.</p>
     *
     * @param videoId UUID video vừa được upload.
     */
    @Async
    public void analyzeVideo(UUID videoId) {
        Video video = videoRepository.findById(videoId)
                .orElseThrow(() -> new RuntimeException("Video not found: " + videoId));

        // Bước 1: Tạo bản ghi job để theo dõi tiến trình phân tích AI.
        AiAnalysisJob job = new AiAnalysisJob();
        job.setVideo(video);
        job.setModelName(aiEnabled ? "google-video-intelligence" : "mock");
        job.setModelVersion("v1");
        job.setStatus("processing");
        job.setStartedAt(LocalDateTime.now());
        job = jobRepository.save(job);

        try {
            // Bước 2: Thực thi phân tích (Google AI thật hoặc mock dữ liệu).
            List<VideoScene> scenes;
            if (aiEnabled && videoAiClient != null) {
                scenes = analyzeWithGoogleAi(video, job);
            } else {
                scenes = createMockAnalysis(video);
            }

            // Bước 3: Cập nhật job thành công.
            job.setScenesDetected(scenes.size());
            job.setStatus("completed");
            job.setCompletedAt(LocalDateTime.now());
            jobRepository.save(job);

            // Bước 4: Tổng hợp tag ở mức video (dùng cho feed/search/recommend).
            aggregateVideoTags(video);

            // Bước 5: Video lên feed ngay sau khi AI gán nhãn xong.
            video.setStatus(VideoStatus.active);
            videoRepository.save(video);

            // Bước 6: Tạo bản ghi hàng chờ để moderator review tag AI sau (priority=normal).
            createModerationQueueEntry(video, job);

            logger.info("AI analysis completed for video {}: {} scenes detected", videoId, scenes.size());
        } catch (Exception e) {
            // Fallback: AI lỗi vẫn cho video lên feed, moderator review thủ công sau.
            logger.error("AI analysis failed for video {}", videoId, e);
            job.setStatus("failed");
            job.setErrorMessage(e.getMessage());
            job.setCompletedAt(LocalDateTime.now());
            jobRepository.save(job);

            video.setStatus(VideoStatus.active);
            videoRepository.save(video);

            createModerationQueueEntry(video, job);
        }
    }

    /**
     * Gọi Google Video Intelligence API để phân tích cảnh và gán nhãn.
     *
     * <p>API trả về hai loại annotation:</p>
     * <ul>
     *   <li>{@code shotAnnotations} – các đoạn cảnh phát hiện được theo thời gian.</li>
     *   <li>{@code shotLabelAnnotations} – các nhãn nội dung kèm điểm tin cậy và segment thời gian.</li>
     * </ul>
     *
     * <p>Logic ánh xạ nhãn vào cảnh: với mỗi nhãn, lặp qua tất cả các cảnh, nếu segment
     * thời gian của nhãn có giao với khoảng thời gian cảnh thì lưu thành {@link SceneTag}
     * cho cảnh đó.</p>
     *
     * @param video video đang phân tích.
     * @param job   bản ghi job hiện hành (để cập nhật metadata).
     * @return danh sách cảnh đã lưu vào DB.
     * @throws Exception khi đọc file MinIO lỗi hoặc Google API trả lỗi.
     */
    private List<VideoScene> analyzeWithGoogleAi(Video video, AiAnalysisJob job) throws Exception {
        // Kiểm tra giới hạn kích thước trước khi đọc toàn bộ file vào memory.
        if (video.getFileSize() != null && video.getFileSize() > MAX_INLINE_AI_FILE_SIZE_BYTES) {
            throw new IllegalStateException("Video is too large for inline AI analysis");
        }

        // Tải video bytes từ MinIO. Lưu ý: API inline yêu cầu byte[] toàn bộ file.
        InputStream videoStream = minioService.getFile(video.getVideoUrl());
        byte[] videoBytes = videoStream.readAllBytes();
        videoStream.close();

        // Xây dựng request với 2 feature: phát hiện cảnh và gán nhãn nội dung.
        AnnotateVideoRequest request = AnnotateVideoRequest.newBuilder()
                .setInputContent(ByteString.copyFrom(videoBytes))
                .addFeatures(Feature.SHOT_CHANGE_DETECTION)
                .addFeatures(Feature.LABEL_DETECTION)
                .build();

        // Gọi bất đồng bộ rồi block chờ kết quả (vì hàm đã ở trong @Async thread).
        AnnotateVideoResponse response = videoAiClient.annotateVideoAsync(request).get();
        VideoAnnotationResults results = response.getAnnotationResults(0);

        // Lưu từng cảnh phát hiện được vào bảng video_scenes.
        List<VideoScene> scenes = new ArrayList<>();
        int index = 0;
        for (VideoSegment shot : results.getShotAnnotationsList()) {
            // Convert Duration (seconds + nanos) sang double cho dễ dùng.
            double startTime = shot.getStartTimeOffset().getSeconds()
                    + shot.getStartTimeOffset().getNanos() / 1e9;
            double endTime = shot.getEndTimeOffset().getSeconds()
                    + shot.getEndTimeOffset().getNanos() / 1e9;

            VideoScene scene = new VideoScene();
            scene.setVideo(video);
            scene.setSceneIndex(index++);
            scene.setStartTime(startTime);
            scene.setEndTime(endTime);
            scene.setStatus("auto_tagged");
            scene = sceneRepository.save(scene);
            scenes.add(scene);
        }

        // Ánh xạ mỗi nhãn vào các cảnh có thời gian chồng lấn.
        for (LabelAnnotation label : results.getShotLabelAnnotationsList()) {
            String tagName = label.getEntity().getDescription();
            String category = label.getCategoryEntitiesList().isEmpty()
                    ? "topic"
                    : label.getCategoryEntities(0).getDescription();

            // Tìm hoặc tạo Tag trong từ điển hệ thống.
            Tag tag = tagService.findOrCreateTag(tagName, category);

            for (LabelSegment segment : label.getSegmentsList()) {
                double segStart = segment.getSegment().getStartTimeOffset().getSeconds()
                        + segment.getSegment().getStartTimeOffset().getNanos() / 1e9;
                double segEnd = segment.getSegment().getEndTimeOffset().getSeconds()
                        + segment.getSegment().getEndTimeOffset().getNanos() / 1e9;

                // Kiểm tra giao thoa khoảng thời gian (interval overlap):
                // segStart < scene.endTime && segEnd > scene.startTime
                for (VideoScene scene : scenes) {
                    if (segStart < scene.getEndTime() && segEnd > scene.getStartTime()) {
                        SceneTag sceneTag = new SceneTag();
                        sceneTag.setSceneId(scene.getId());
                        sceneTag.setTagId(tag.getId());
                        sceneTag.setSource("ai");
                        sceneTag.setConfidence((double) segment.getConfidence());
                        sceneTagRepository.save(sceneTag);
                    }
                }
            }
        }

        return scenes;
    }

    /**
     * Tạo dữ liệu phân tích giả lập khi AI bị tắt hoặc client không khả dụng.
     *
     * <p>Tạo một cảnh duy nhất bao trùm toàn bộ thời lượng video,
     * gán một tag "Unclassified" với confidence = 0 (báo hiệu cần review thủ công).</p>
     *
     * @param video video cần tạo dữ liệu mock.
     * @return danh sách chứa duy nhất 1 cảnh giả lập.
     */
    private List<VideoScene> createMockAnalysis(Video video) {
        VideoScene scene = new VideoScene();
        scene.setVideo(video);
        scene.setSceneIndex(0);
        scene.setStartTime(0.0);
        scene.setEndTime(video.getDurationSeconds() != null ? video.getDurationSeconds().doubleValue() : 60.0);
        scene.setAiSummary("Full video (mock analysis - AI disabled)");
        scene.setStatus("auto_tagged");
        scene = sceneRepository.save(scene);

        Tag mockTag = tagService.findOrCreateTag("Unclassified", "topic");
        SceneTag sceneTag = new SceneTag();
        sceneTag.setSceneId(scene.getId());
        sceneTag.setTagId(mockTag.getId());
        sceneTag.setSource("ai");
        sceneTag.setConfidence(0.0);
        sceneTagRepository.save(sceneTag);

        return List.of(scene);
    }

    /**
     * Tổng hợp các tag mức cảnh thành tag mức video (cho feed/search/recommend).
     *
     * <p>Với mỗi tag, lấy điểm tin cậy lớn nhất xuyên suốt các cảnh của video
     * (max-aggregation), sau đó lưu vào bảng {@code video_tags} với {@code source='aggregated'}.</p>
     *
     * <p>Bảng {@code video_tags} bị xoá toàn bộ trước khi insert lại, đảm bảo idempotent
     * nếu phân tích chạy lại nhiều lần.</p>
     *
     * @param video video cần tổng hợp tag.
     */
    private void aggregateVideoTags(Video video) {
        List<VideoScene> scenes = sceneRepository.findByVideoIdOrderBySceneIndex(video.getId());
        Map<UUID, Double> tagMaxConfidence = new HashMap<>();

        // Lấy điểm tin cậy lớn nhất của mỗi tag xuyên các cảnh.
        for (VideoScene scene : scenes) {
            List<SceneTag> sceneTags = sceneTagRepository.findBySceneId(scene.getId());
            for (SceneTag st : sceneTags) {
                tagMaxConfidence.merge(st.getTagId(), st.getConfidence() != null ? st.getConfidence() : 0.0, Math::max);
            }
        }

        // Xoá cũ rồi insert mới — đảm bảo idempotent khi chạy lại.
        videoTagRepository.deleteByVideoId(video.getId());
        for (Map.Entry<UUID, Double> entry : tagMaxConfidence.entrySet()) {
            VideoTag vt = new VideoTag();
            vt.setVideoId(video.getId());
            vt.setTagId(entry.getKey());
            vt.setSource("aggregated");
            vt.setWeight(entry.getValue());
            videoTagRepository.save(vt);
        }
    }

    /**
     * Tạo một bản ghi mới trong {@code moderation_queue} ngay sau khi AI phân tích xong.
     * Mặc định {@code priority=normal} và {@code status=pending}.
     *
     * <p>Báo cáo người dùng (Reports) sẽ nâng cấp priority lên {@code high} ở luồng khác.</p>
     *
     * @param video video vừa upload.
     * @param job   AI job vừa hoàn tất hoặc fail (vẫn tạo queue entry kể cả khi fail).
     */
    private void createModerationQueueEntry(Video video, AiAnalysisJob job) {
        ModerationQueue queue = new ModerationQueue();
        queue.setVideo(video);
        queue.setAiJob(job);
        queue.setPriority("normal");
        queue.setStatus("pending");
        queueRepository.save(queue);
    }
}
