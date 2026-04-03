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

@Service
public class AiAnalysisService {

    private static final Logger logger = LoggerFactory.getLogger(AiAnalysisService.class);
    private static final long MAX_INLINE_AI_FILE_SIZE_BYTES = 50L * 1024L * 1024L;

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

    @Autowired(required = false)
    private VideoIntelligenceServiceClient videoAiClient;

    @Async
    public void analyzeVideo(UUID videoId) {
        Video video = videoRepository.findById(videoId)
                .orElseThrow(() -> new RuntimeException("Video not found: " + videoId));

        AiAnalysisJob job = new AiAnalysisJob();
        job.setVideo(video);
        job.setModelName(aiEnabled ? "google-video-intelligence" : "mock");
        job.setModelVersion("v1");
        job.setStatus("processing");
        job.setStartedAt(LocalDateTime.now());
        job = jobRepository.save(job);

        try {
            List<VideoScene> scenes;
            if (aiEnabled && videoAiClient != null) {
                scenes = analyzeWithGoogleAi(video, job);
            } else {
                scenes = createMockAnalysis(video);
            }

            job.setScenesDetected(scenes.size());
            job.setStatus("completed");
            job.setCompletedAt(LocalDateTime.now());
            jobRepository.save(job);

            aggregateVideoTags(video);

            // Video tự động lên feed sau khi AI gán nhãn xong
            video.setStatus(VideoStatus.active);
            videoRepository.save(video);

            // Tạo queue entry để admin review nhãn nếu cần
            createModerationQueueEntry(video, job);

            logger.info("AI analysis completed for video {}: {} scenes detected", videoId, scenes.size());
        } catch (Exception e) {
            logger.error("AI analysis failed for video {}", videoId, e);
            job.setStatus("failed");
            job.setErrorMessage(e.getMessage());
            job.setCompletedAt(LocalDateTime.now());
            jobRepository.save(job);

            // AI lỗi vẫn cho video lên feed, admin review sau
            video.setStatus(VideoStatus.active);
            videoRepository.save(video);

            createModerationQueueEntry(video, job);
        }
    }

    private List<VideoScene> analyzeWithGoogleAi(Video video, AiAnalysisJob job) throws Exception {
        if (video.getFileSize() != null && video.getFileSize() > MAX_INLINE_AI_FILE_SIZE_BYTES) {
            throw new IllegalStateException("Video is too large for inline AI analysis");
        }

        InputStream videoStream = minioService.getFile(video.getVideoUrl());
        byte[] videoBytes = videoStream.readAllBytes();
        videoStream.close();

        AnnotateVideoRequest request = AnnotateVideoRequest.newBuilder()
                .setInputContent(ByteString.copyFrom(videoBytes))
                .addFeatures(Feature.SHOT_CHANGE_DETECTION)
                .addFeatures(Feature.LABEL_DETECTION)
                .build();

        AnnotateVideoResponse response = videoAiClient.annotateVideoAsync(request).get();
        VideoAnnotationResults results = response.getAnnotationResults(0);

        List<VideoScene> scenes = new ArrayList<>();
        int index = 0;
        for (VideoSegment shot : results.getShotAnnotationsList()) {
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

        for (LabelAnnotation label : results.getShotLabelAnnotationsList()) {
            String tagName = label.getEntity().getDescription();
            String category = label.getCategoryEntitiesList().isEmpty()
                    ? "topic"
                    : label.getCategoryEntities(0).getDescription();

            Tag tag = tagService.findOrCreateTag(tagName, category);

            for (LabelSegment segment : label.getSegmentsList()) {
                double segStart = segment.getSegment().getStartTimeOffset().getSeconds()
                        + segment.getSegment().getStartTimeOffset().getNanos() / 1e9;
                double segEnd = segment.getSegment().getEndTimeOffset().getSeconds()
                        + segment.getSegment().getEndTimeOffset().getNanos() / 1e9;

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

    private void aggregateVideoTags(Video video) {
        List<VideoScene> scenes = sceneRepository.findByVideoIdOrderBySceneIndex(video.getId());
        Map<UUID, Double> tagMaxConfidence = new HashMap<>();

        for (VideoScene scene : scenes) {
            List<SceneTag> sceneTags = sceneTagRepository.findBySceneId(scene.getId());
            for (SceneTag st : sceneTags) {
                tagMaxConfidence.merge(st.getTagId(), st.getConfidence() != null ? st.getConfidence() : 0.0, Math::max);
            }
        }

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

    private void createModerationQueueEntry(Video video, AiAnalysisJob job) {
        ModerationQueue queue = new ModerationQueue();
        queue.setVideo(video);
        queue.setAiJob(job);
        queue.setPriority("normal");
        queue.setStatus("pending");
        queueRepository.save(queue);
    }
}
