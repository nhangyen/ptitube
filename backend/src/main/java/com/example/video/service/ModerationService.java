package com.example.video.service;

import com.example.video.dto.ModerationQueueResponse;
import com.example.video.dto.SceneDetailResponse;
import com.example.video.dto.TagResponse;
import com.example.video.model.*;
import com.example.video.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Lớp Service triển khai toàn bộ logic nghiệp vụ kiểm duyệt video.
 *
 * <p>Dịch vụ này được {@link com.example.video.controller.ModerationController} gọi đến
 * và phối hợp nhiều repository để thực hiện các thao tác:</p>
 * <ul>
 *   <li>Quản lý vòng đời hàng chờ kiểm duyệt (pending → in_review → reviewed).</li>
 *   <li>Phê duyệt / từ chối video kèm audit trail bất biến trong {@code moderation_actions}.</li>
 *   <li>Chỉnh sửa tag thủ công ở mức cảnh, đánh dấu cảnh là {@code revised}.</li>
 *   <li>Tự động đóng các báo cáo người dùng khi video bị từ chối.</li>
 * </ul>
 *
 * <p>Tất cả các phương thức thay đổi dữ liệu đều được bọc trong transaction
 * (annotation {@link Transactional}) để đảm bảo tính toàn vẹn dữ liệu — nếu
 * một bước fails, toàn bộ thay đổi sẽ rollback.</p>
 *
 * <p><b>Tác giả phụ trách:</b> Hoàng Sơn Lâm (B22DCCN477)</p>
 */
@Service
public class ModerationService {

    @Autowired
    private ModerationQueueRepository queueRepository;

    @Autowired
    private ModerationActionRepository actionRepository;

    @Autowired
    private VideoSceneRepository sceneRepository;

    @Autowired
    private SceneTagRepository sceneTagRepository;

    @Autowired
    private VideoTagRepository videoTagRepository;

    @Autowired
    private TagRepository tagRepository;

    @Autowired
    private VideoRepository videoRepository;

    @Autowired
    private ReportRepository reportRepository;

    @Autowired
    private UserRepository userRepository;

    /**
     * Đếm số lượng bản ghi hàng chờ theo từng trạng thái.
     * Dùng cho badge số lượng trên các tab màn hình Moderation.
     *
     * @return Map có khóa: {@code "pending"}, {@code "in_review"}, {@code "reviewed"}.
     */
    public Map<String, Long> getQueueStats() {
        Map<String, Long> stats = new HashMap<>();
        stats.put("pending", queueRepository.countByStatus("pending"));
        stats.put("in_review", queueRepository.countByStatus("in_review"));
        stats.put("reviewed", queueRepository.countByStatus("reviewed"));
        return stats;
    }

    /**
     * Lấy danh sách hàng chờ kiểm duyệt, sắp xếp theo thời gian tạo giảm dần.
     *
     * @param status trạng thái cần lọc; nếu null hoặc rỗng sẽ lấy tất cả.
     * @param page   chỉ số trang (0-based).
     * @param size   số phần tử mỗi trang.
     * @return trang chứa các {@link ModerationQueueResponse} kèm thông tin video, uploader,
     *         số cảnh, số report, mức ưu tiên.
     */
    public Page<ModerationQueueResponse> getQueue(String status, int page, int size) {
        Page<ModerationQueue> items;
        if (status != null && !status.isBlank()) {
            items = queueRepository.findByStatusOrderByCreatedAtDesc(status, PageRequest.of(page, size));
        } else {
            items = queueRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(page, size));
        }
        return items.map(this::toQueueResponse);
    }

    /**
     * Lấy chi tiết một bản ghi hàng chờ.
     *
     * @param queueId UUID của bản ghi {@code moderation_queue}.
     * @throws RuntimeException nếu không tồn tại bản ghi tương ứng.
     */
    public ModerationQueueResponse getQueueItem(UUID queueId) {
        ModerationQueue queue = queueRepository.findById(queueId)
                .orElseThrow(() -> new RuntimeException("Queue item not found"));
        return toQueueResponse(queue);
    }

    /**
     * Lấy danh sách cảnh kèm tag của video thuộc bản ghi hàng chờ.
     * Các cảnh được sắp xếp theo {@code sceneIndex} tăng dần (thứ tự xuất hiện trong video).
     *
     * @param queueId UUID của bản ghi {@code moderation_queue}.
     * @return danh sách {@link SceneDetailResponse} đầy đủ tag (cả AI và admin) kèm
     *         điểm tin cậy cho từng tag.
     */
    public List<SceneDetailResponse> getVideoScenes(UUID queueId) {
        ModerationQueue queue = queueRepository.findById(queueId)
                .orElseThrow(() -> new RuntimeException("Queue item not found"));

        List<VideoScene> scenes = sceneRepository.findByVideoIdOrderBySceneIndex(queue.getVideo().getId());
        return scenes.stream().map(this::toSceneDetail).collect(Collectors.toList());
    }

    /**
     * Gán một bản ghi hàng chờ cho moderator (nhận video vào xử lý).
     * Chuyển trạng thái từ {@code pending} sang {@code in_review}.
     *
     * @param queueId     UUID hàng chờ.
     * @param moderatorId UUID của moderator đang đăng nhập.
     * @throws RuntimeException nếu không tìm thấy hàng chờ hoặc user.
     */
    @Transactional
    public void assignToModerator(UUID queueId, UUID moderatorId) {
        ModerationQueue queue = queueRepository.findById(queueId)
                .orElseThrow(() -> new RuntimeException("Queue item not found"));
        User moderator = userRepository.findById(moderatorId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        queue.setAssignedTo(moderator);
        queue.setStatus("in_review");
        queueRepository.save(queue);
    }

    /**
     * Đánh dấu hàng chờ là đã review tag xong (không kèm phán quyết video).
     * Ghi một {@link ModerationAction} với action = {@code reviewed} để làm audit.
     * Không thay đổi trạng thái video.
     *
     * @param queueId UUID hàng chờ.
     * @param adminId UUID người thực hiện.
     * @param notes   ghi chú của moderator (có thể null).
     */
    @Transactional
    public void markReviewed(UUID queueId, UUID adminId, String notes) {
        ModerationQueue queue = queueRepository.findById(queueId)
                .orElseThrow(() -> new RuntimeException("Queue item not found"));
        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        queue.setStatus("reviewed");
        queueRepository.save(queue);

        ModerationAction action = new ModerationAction();
        action.setQueue(queue);
        action.setAdmin(admin);
        action.setAction("reviewed");
        action.setScope("video");
        action.setReason(notes);
        actionRepository.save(action);
    }

    /**
     * Phê duyệt video: đảm bảo video ở trạng thái {@code active}, đóng hàng chờ
     * và ghi audit trail.
     *
     * <p>Đây là transaction 3 bước:</p>
     * <ol>
     *   <li>Cập nhật {@code moderation_queue.status = reviewed}.</li>
     *   <li>Cập nhật {@code videos.status = active}.</li>
     *   <li>Insert một bản ghi {@code moderation_actions} với {@code action=approve}.</li>
     * </ol>
     *
     * @param queueId UUID hàng chờ.
     * @param adminId UUID người phê duyệt.
     * @param reason  lý do (tuỳ chọn).
     */
    @Transactional
    public void approveVideo(UUID queueId, UUID adminId, String reason) {
        ModerationQueue queue = queueRepository.findById(queueId)
                .orElseThrow(() -> new RuntimeException("Queue item not found"));
        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        queue.setStatus("reviewed");
        queueRepository.save(queue);

        Video video = queue.getVideo();
        video.setStatus(VideoStatus.active);
        videoRepository.save(video);

        ModerationAction action = new ModerationAction();
        action.setQueue(queue);
        action.setAdmin(admin);
        action.setAction("approve");
        action.setScope("video");
        action.setReason(reason);
        actionRepository.save(action);
    }

    /**
     * Từ chối video: ban video, tự động đóng tất cả báo cáo người dùng còn mở,
     * và ghi audit trail.
     *
     * <p>Đây là transaction 4 bước:</p>
     * <ol>
     *   <li>Cập nhật {@code moderation_queue.status = reviewed}.</li>
     *   <li>Cập nhật {@code videos.status = banned}.</li>
     *   <li>Tìm tất cả {@code reports} có {@code status='open'} với cùng video_id và cập nhật về {@code resolved}.</li>
     *   <li>Insert một bản ghi {@code moderation_actions} với {@code action=reject}.</li>
     * </ol>
     *
     * @param queueId UUID hàng chờ.
     * @param adminId UUID người từ chối.
     * @param reason  lý do từ chối (nên bắt buộc theo business rule).
     */
    @Transactional
    public void rejectVideo(UUID queueId, UUID adminId, String reason) {
        ModerationQueue queue = queueRepository.findById(queueId)
                .orElseThrow(() -> new RuntimeException("Queue item not found"));
        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        queue.setStatus("reviewed");
        queueRepository.save(queue);

        Video video = queue.getVideo();
        video.setStatus(VideoStatus.banned);
        videoRepository.save(video);

        // Tự động đóng các báo cáo người dùng còn mở liên quan đến video này.
        // Việc này tránh việc video bị ban rồi vẫn còn báo cáo treo trong hệ thống.
        List<Report> openReports = reportRepository.findByVideoId(video.getId())
                .stream().filter(r -> "open".equals(r.getStatus())).collect(Collectors.toList());
        for (Report report : openReports) {
            report.setStatus("resolved");
            reportRepository.save(report);
        }

        ModerationAction action = new ModerationAction();
        action.setQueue(queue);
        action.setAdmin(admin);
        action.setAction("reject");
        action.setScope("video");
        action.setReason(reason);
        actionRepository.save(action);
    }

    /**
     * Thêm một tag thủ công vào cảnh.
     * Tag được lưu với {@code source='admin'} và {@code confidence=1.0}
     * (tag thủ công luôn có độ tin cậy tuyệt đối).
     * Cảnh được đánh dấu {@code revised}.
     *
     * @param sceneId UUID cảnh.
     * @param tagId   UUID tag cần thêm.
     * @param adminId UUID người thêm.
     */
    @Transactional
    public void addTagToScene(UUID sceneId, UUID tagId, UUID adminId) {
        VideoScene scene = sceneRepository.findById(sceneId)
                .orElseThrow(() -> new RuntimeException("Scene not found"));
        tagRepository.findById(tagId)
                .orElseThrow(() -> new RuntimeException("Tag not found"));

        SceneTag sceneTag = new SceneTag();
        sceneTag.setSceneId(sceneId);
        sceneTag.setTagId(tagId);
        sceneTag.setSource("admin");
        sceneTag.setConfidence(1.0);
        sceneTag.setAssignedBy(adminId);
        sceneTagRepository.save(sceneTag);

        scene.setStatus("revised");
        sceneRepository.save(scene);
    }

    /**
     * Xoá một tag khỏi cảnh (xoá theo composite key {@code sceneId + tagId}).
     * Cảnh được đánh dấu {@code revised} bất kể tag bị xoá là AI hay admin.
     *
     * @param sceneId UUID cảnh.
     * @param tagId   UUID tag cần xoá.
     * @param adminId UUID người thực hiện (chỉ phục vụ audit, hiện chưa lưu).
     */
    @Transactional
    public void removeTagFromScene(UUID sceneId, UUID tagId, UUID adminId) {
        sceneTagRepository.deleteBySceneIdAndTagId(sceneId, tagId);

        VideoScene scene = sceneRepository.findById(sceneId)
                .orElseThrow(() -> new RuntimeException("Scene not found"));
        scene.setStatus("revised");
        sceneRepository.save(scene);
    }

    /**
     * Map một {@link ModerationQueue} sang DTO {@link ModerationQueueResponse} để trả về client.
     * Đồng thời truy vấn thêm số cảnh và số báo cáo để hiển thị badge trên màn hình hàng chờ.
     *
     * @param queue entity hàng chờ từ database.
     * @return DTO đã đầy đủ thông tin trình bày.
     */
    private ModerationQueueResponse toQueueResponse(ModerationQueue queue) {
        ModerationQueueResponse resp = new ModerationQueueResponse();
        resp.setQueueId(queue.getId());
        resp.setVideoId(queue.getVideo().getId());
        resp.setVideoTitle(queue.getVideo().getTitle());
        resp.setVideoThumbnail(queue.getVideo().getThumbnailUrl());
        resp.setUploaderUsername(queue.getVideo().getUser().getUsername());
        resp.setUploaderId(queue.getVideo().getUser().getId());
        resp.setPriority(queue.getPriority());
        resp.setStatus(queue.getStatus());
        resp.setAssignedTo(queue.getAssignedTo() != null ? queue.getAssignedTo().getUsername() : null);
        resp.setAiJobStatus(queue.getAiJob() != null ? queue.getAiJob().getStatus() : null);
        resp.setSceneCount((int) sceneRepository.countByVideoId(queue.getVideo().getId()));
        resp.setReportCount(reportRepository.countByVideoId(queue.getVideo().getId()));
        resp.setVideoStatus(queue.getVideo().getStatus().name());
        resp.setAutoFlags(queue.getAutoFlags());
        resp.setCreatedAt(queue.getCreatedAt());
        return resp;
    }

    /**
     * Lấy danh sách báo cáo vi phạm đang mở của video, để moderator xem khi
     * ra quyết định phê duyệt/từ chối.
     *
     * @param queueId UUID hàng chờ.
     * @return danh sách Map với các khóa: {@code id}, {@code reason},
     *         {@code reporterUsername}, {@code createdAt}.
     */
    public List<Map<String, Object>> getVideoReports(UUID queueId) {
        ModerationQueue queue = queueRepository.findById(queueId)
                .orElseThrow(() -> new RuntimeException("Queue item not found"));
        List<Report> reports = reportRepository.findByVideoId(queue.getVideo().getId());
        return reports.stream()
                .filter(r -> "open".equals(r.getStatus()))
                .map(r -> Map.<String, Object>of(
                        "id", r.getId(),
                        "reason", r.getReason(),
                        "reporterUsername", r.getReporter().getUsername(),
                        "createdAt", r.getCreatedAt().toString()
                ))
                .collect(Collectors.toList());
    }

    /**
     * Map một {@link VideoScene} sang DTO {@link SceneDetailResponse} cùng với danh sách tag.
     * Mỗi tag mang thông tin nguồn (AI/admin) và điểm tin cậy để mobile UI có thể
     * highlight các tag nguy cơ cao (confidence ≥ 0.8).
     */
    private SceneDetailResponse toSceneDetail(VideoScene scene) {
        SceneDetailResponse resp = new SceneDetailResponse();
        resp.setSceneId(scene.getId());
        resp.setSceneIndex(scene.getSceneIndex());
        resp.setStartTime(scene.getStartTime());
        resp.setEndTime(scene.getEndTime());
        resp.setThumbnailUrl(scene.getThumbnailUrl());
        resp.setAiSummary(scene.getAiSummary());
        resp.setStatus(scene.getStatus());

        List<SceneTag> sceneTags = sceneTagRepository.findBySceneId(scene.getId());
        List<TagResponse> tags = sceneTags.stream().map(st -> {
            TagResponse tr = new TagResponse();
            tr.setId(st.getTagId());
            if (st.getTag() != null) {
                tr.setName(st.getTag().getName());
                tr.setCategory(st.getTag().getCategory());
            }
            tr.setSource(st.getSource());
            tr.setConfidence(st.getConfidence());
            return tr;
        }).collect(Collectors.toList());
        resp.setTags(tags);

        return resp;
    }
}
