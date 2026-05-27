package com.example.video.controller;

import com.example.video.dto.ModerationActionRequest;
import com.example.video.dto.ModerationQueueResponse;
import com.example.video.dto.SceneDetailResponse;
import com.example.video.model.AiAnalysisJob;
import com.example.video.model.Tag;
import com.example.video.model.User;
import com.example.video.model.UserRole;
import com.example.video.repository.AiAnalysisJobRepository;
import com.example.video.repository.UserRepository;
import com.example.video.service.ModerationService;
import com.example.video.service.TagService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * REST Controller cho hệ thống kiểm duyệt video.
 *
 * <p>Đây là cổng vào duy nhất cho các thao tác kiểm duyệt từ phía mobile app
 * (màn hình Moderation tab). Mọi endpoint ở đây đều yêu cầu người dùng có vai trò
 * {@link UserRole#admin} hoặc {@link UserRole#moderator}; người dùng thường sẽ
 * nhận về HTTP 403 nếu cố truy cập.</p>
 *
 * <p><b>Nhóm endpoint chính:</b></p>
 * <ul>
 *   <li><code>GET /api/moderation/stats</code> – đếm số video trong từng trạng thái hàng chờ.</li>
 *   <li><code>GET /api/moderation/queue</code> – danh sách hàng chờ, hỗ trợ lọc theo status và phân trang.</li>
 *   <li><code>POST /api/moderation/queue/&#123;id&#125;/assign|review|approve|reject</code> – các hành động phán quyết.</li>
 *   <li><code>POST/DELETE /api/moderation/scenes/&#123;sceneId&#125;/tags</code> – chỉnh sửa tag ở mức cảnh.</li>
 *   <li><code>GET /api/moderation/tags</code>, <code>POST /api/moderation/tags</code> – quản lý từ điển tag.</li>
 * </ul>
 *
 * <p><b>Tác giả phụ trách:</b> Hoàng Sơn Lâm (B22DCCN477)</p>
 *
 * @see ModerationService logic nghiệp vụ
 * @see com.example.video.service.AiAnalysisService dịch vụ AI tạo hàng chờ tự động
 */
@RestController
@RequestMapping("/api/moderation")
@CrossOrigin(origins = "*")
public class ModerationController {

    @Autowired
    private ModerationService moderationService;

    @Autowired
    private TagService tagService;

    @Autowired
    private AiAnalysisJobRepository aiJobRepository;

    @Autowired
    private UserRepository userRepository;

    // ==================== STATS ====================

    /**
     * Đếm số bản ghi hàng chờ theo từng trạng thái (pending / in_review / reviewed).
     * Dùng để hiển thị badge số lượng trên các tab của màn hình Moderation.
     *
     * @param authentication thông tin xác thực JWT từ Spring Security
     * @return {@code Map<String, Long>} với khóa là tên trạng thái, giá trị là số lượng;
     *         hoặc HTTP 403 nếu không có quyền moderator.
     */
    @GetMapping("/stats")
    public ResponseEntity<?> getQueueStats(Authentication authentication) {
        if (!isModerator(authentication)) {
            return ResponseEntity.status(403).body(Map.of("error", "Access denied"));
        }
        return ResponseEntity.ok(moderationService.getQueueStats());
    }

    // ==================== QUEUE ====================

    /**
     * Lấy danh sách video trong hàng chờ kiểm duyệt, có thể lọc theo trạng thái.
     *
     * @param status   trạng thái cần lọc (pending | in_review | reviewed); null = lấy tất cả.
     * @param page     chỉ số trang (mặc định 0).
     * @param size     số phần tử mỗi trang (mặc định 20).
     * @param authentication thông tin người dùng từ JWT.
     * @return trang {@link ModerationQueueResponse} đã sắp xếp theo thời gian giảm dần,
     *         hoặc HTTP 403 nếu không có quyền.
     */
    @GetMapping("/queue")
    public ResponseEntity<?> getQueue(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication authentication) {
        if (!isModerator(authentication)) {
            return ResponseEntity.status(403).body(Map.of("error", "Access denied"));
        }
        Page<ModerationQueueResponse> queue = moderationService.getQueue(status, page, size);
        return ResponseEntity.ok(queue);
    }

    /**
     * Lấy chi tiết một bản ghi hàng chờ kiểm duyệt theo ID.
     *
     * @param queueId UUID của bản ghi {@code moderation_queue}.
     * @return {@link ModerationQueueResponse}; HTTP 403 nếu không có quyền;
     *         {@link RuntimeException} nếu không tìm thấy bản ghi.
     */
    @GetMapping("/queue/{queueId}")
    public ResponseEntity<?> getQueueItem(@PathVariable UUID queueId, Authentication authentication) {
        if (!isModerator(authentication)) {
            return ResponseEntity.status(403).body(Map.of("error", "Access denied"));
        }
        ModerationQueueResponse item = moderationService.getQueueItem(queueId);
        return ResponseEntity.ok(item);
    }

    /**
     * Lấy danh sách cảnh (scene) của video gắn với bản ghi hàng chờ, kèm theo tag AI/admin
     * và điểm tin cậy cho từng tag. Phục vụ màn hình chi tiết video kiểm duyệt trên mobile.
     *
     * @param queueId UUID của hàng chờ kiểm duyệt.
     * @return danh sách {@link SceneDetailResponse} sắp xếp theo {@code sceneIndex}.
     */
    @GetMapping("/queue/{queueId}/scenes")
    public ResponseEntity<?> getVideoScenes(@PathVariable UUID queueId, Authentication authentication) {
        if (!isModerator(authentication)) {
            return ResponseEntity.status(403).body(Map.of("error", "Access denied"));
        }
        List<SceneDetailResponse> scenes = moderationService.getVideoScenes(queueId);
        return ResponseEntity.ok(scenes);
    }

    /**
     * Gán bản ghi hàng chờ cho moderator hiện tại đang đăng nhập (lấy từ JWT).
     * Sau khi gán thành công, trạng thái của hàng chờ chuyển sang {@code in_review}.
     *
     * @param queueId UUID của hàng chờ kiểm duyệt cần nhận.
     * @return HTTP 200 với thông báo nếu thành công; HTTP 403 nếu không có quyền.
     */
    @PostMapping("/queue/{queueId}/assign")
    public ResponseEntity<?> assignToMe(@PathVariable UUID queueId, Authentication authentication) {
        UUID userId = getCurrentUserId(authentication);
        if (userId == null || !isModerator(authentication)) {
            return ResponseEntity.status(403).body(Map.of("error", "Access denied"));
        }
        moderationService.assignToModerator(queueId, userId);
        return ResponseEntity.ok(Map.of("message", "Assigned successfully"));
    }

    // ==================== ACTIONS ====================

    /**
     * Đánh dấu một hàng chờ là đã review xong tag (không thay đổi trạng thái video).
     * Dùng khi moderator chỉ chỉnh sửa tag mà không cần phê duyệt/từ chối.
     *
     * @param queueId UUID hàng chờ.
     * @param request body chứa lý do/ghi chú (không bắt buộc).
     * @return HTTP 200 nếu thành công; HTTP 403 nếu không có quyền.
     */
    @PostMapping("/queue/{queueId}/review")
    public ResponseEntity<?> markReviewed(
            @PathVariable UUID queueId,
            @RequestBody(required = false) ModerationActionRequest request,
            Authentication authentication) {
        UUID userId = getCurrentUserId(authentication);
        if (userId == null || !isModerator(authentication)) {
            return ResponseEntity.status(403).body(Map.of("error", "Access denied"));
        }
        String notes = request != null ? request.getReason() : null;
        moderationService.markReviewed(queueId, userId, notes);
        return ResponseEntity.ok(Map.of("message", "Tags reviewed"));
    }

    /**
     * Phê duyệt video: chuyển video sang trạng thái {@code active} (nếu chưa),
     * đánh dấu hàng chờ {@code reviewed} và ghi một bản ghi {@code moderation_actions}
     * với action = {@code approve} để làm audit trail.
     *
     * @param queueId UUID hàng chờ.
     * @param request body chứa lý do (không bắt buộc cho approve).
     * @return HTTP 200 với thông báo; HTTP 403 nếu không có quyền.
     */
    @PostMapping("/queue/{queueId}/approve")
    public ResponseEntity<?> approveVideo(
            @PathVariable UUID queueId,
            @RequestBody(required = false) ModerationActionRequest request,
            Authentication authentication) {
        UUID userId = getCurrentUserId(authentication);
        if (userId == null || !isModerator(authentication)) {
            return ResponseEntity.status(403).body(Map.of("error", "Access denied"));
        }
        String reason = request != null ? request.getReason() : null;
        moderationService.approveVideo(queueId, userId, reason);
        return ResponseEntity.ok(Map.of("message", "Video approved"));
    }

    /**
     * Từ chối video: chuyển video sang trạng thái {@code banned}, đóng tất cả báo cáo
     * liên quan (status → {@code resolved}) và ghi audit trail với action = {@code reject}.
     *
     * <p><b>Lưu ý:</b> Trường {@code reason} trong body nên bắt buộc do business rule,
     * tuy nhiên validation hiện đang được thực hiện ở phía client (mobile UI).</p>
     *
     * @param queueId UUID hàng chờ.
     * @param request body chứa lý do từ chối.
     * @return HTTP 200 với thông báo; HTTP 403 nếu không có quyền.
     */
    @PostMapping("/queue/{queueId}/reject")
    public ResponseEntity<?> rejectVideo(
            @PathVariable UUID queueId,
            @RequestBody(required = false) ModerationActionRequest request,
            Authentication authentication) {
        UUID userId = getCurrentUserId(authentication);
        if (userId == null || !isModerator(authentication)) {
            return ResponseEntity.status(403).body(Map.of("error", "Access denied"));
        }
        String reason = request != null ? request.getReason() : null;
        moderationService.rejectVideo(queueId, userId, reason);
        return ResponseEntity.ok(Map.of("message", "Video rejected"));
    }

    // ==================== REPORTS ====================

    /**
     * Lấy danh sách báo cáo vi phạm của người dùng cho video đang được kiểm duyệt.
     * Chỉ trả về các báo cáo có trạng thái {@code open}.
     *
     * @param queueId UUID hàng chờ.
     * @return danh sách các báo cáo (id, lý do, người báo cáo, thời gian).
     */
    @GetMapping("/queue/{queueId}/reports")
    public ResponseEntity<?> getVideoReports(@PathVariable UUID queueId, Authentication authentication) {
        if (!isModerator(authentication)) {
            return ResponseEntity.status(403).body(Map.of("error", "Access denied"));
        }
        return ResponseEntity.ok(moderationService.getVideoReports(queueId));
    }

    // ==================== SCENE TAGS ====================

    /**
     * Thêm một tag thủ công vào cảnh cụ thể. Tag được lưu với {@code source = 'admin'}
     * và {@code confidence = 1.0}. Cảnh sẽ chuyển trạng thái sang {@code revised}.
     *
     * @param sceneId UUID của cảnh.
     * @param body    JSON body chứa key {@code tagId}.
     * @return HTTP 200 nếu thành công; HTTP 403 nếu không có quyền.
     */
    @PostMapping("/scenes/{sceneId}/tags")
    public ResponseEntity<?> addTagToScene(
            @PathVariable UUID sceneId,
            @RequestBody Map<String, String> body,
            Authentication authentication) {
        UUID userId = getCurrentUserId(authentication);
        if (userId == null || !isModerator(authentication)) {
            return ResponseEntity.status(403).body(Map.of("error", "Access denied"));
        }
        UUID tagId = UUID.fromString(body.get("tagId"));
        moderationService.addTagToScene(sceneId, tagId, userId);
        return ResponseEntity.ok(Map.of("message", "Tag added"));
    }

    /**
     * Xoá một tag khỏi cảnh (cả tag AI và tag admin). Cảnh chuyển sang {@code revised}.
     *
     * @param sceneId UUID của cảnh.
     * @param tagId   UUID của tag cần xoá.
     * @return HTTP 200 nếu thành công; HTTP 403 nếu không có quyền.
     */
    @DeleteMapping("/scenes/{sceneId}/tags/{tagId}")
    public ResponseEntity<?> removeTagFromScene(
            @PathVariable UUID sceneId,
            @PathVariable UUID tagId,
            Authentication authentication) {
        UUID userId = getCurrentUserId(authentication);
        if (userId == null || !isModerator(authentication)) {
            return ResponseEntity.status(403).body(Map.of("error", "Access denied"));
        }
        moderationService.removeTagFromScene(sceneId, tagId, userId);
        return ResponseEntity.ok(Map.of("message", "Tag removed"));
    }

    // ==================== TAGS ====================

    /**
     * Trả về toàn bộ các tag đang active trong từ điển hệ thống.
     * Phục vụ moderator chọn tag khi thêm thủ công vào cảnh.
     *
     * @return danh sách {@link Tag}.
     */
    @GetMapping("/tags")
    public ResponseEntity<?> getAllTags(Authentication authentication) {
        if (!isModerator(authentication)) {
            return ResponseEntity.status(403).body(Map.of("error", "Access denied"));
        }
        List<Tag> tags = tagService.getAllActiveTags();
        return ResponseEntity.ok(tags);
    }

    /**
     * Tạo tag mới trong từ điển hệ thống (nếu moderator phát hiện thiếu tag cần thiết).
     *
     * @param body JSON body chứa {@code name} và {@code category}.
     * @return {@link Tag} vừa tạo.
     */
    @PostMapping("/tags")
    public ResponseEntity<?> createTag(@RequestBody Map<String, String> body, Authentication authentication) {
        if (!isModerator(authentication)) {
            return ResponseEntity.status(403).body(Map.of("error", "Access denied"));
        }
        Tag tag = tagService.createTag(body.get("name"), body.get("category"));
        return ResponseEntity.ok(tag);
    }

    // ==================== AI JOBS ====================

    /**
     * Lấy lịch sử các AI analysis jobs đã chạy cho một video.
     * Dùng để moderator kiểm tra trạng thái và lỗi của tiến trình phân tích AI.
     *
     * @param videoId UUID của video.
     * @return danh sách {@link AiAnalysisJob}.
     */
    @GetMapping("/jobs/{videoId}")
    public ResponseEntity<?> getAiJobs(@PathVariable UUID videoId, Authentication authentication) {
        if (!isModerator(authentication)) {
            return ResponseEntity.status(403).body(Map.of("error", "Access denied"));
        }
        List<AiAnalysisJob> jobs = aiJobRepository.findByVideoId(videoId);
        return ResponseEntity.ok(jobs);
    }

    // ==================== HELPERS ====================

    /**
     * Lấy UUID của người dùng hiện tại từ {@link Authentication}.
     * Trả về {@code null} nếu chưa đăng nhập hoặc không tìm thấy user.
     */
    private UUID getCurrentUserId(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return null;
        }
        return userRepository.findByUsername(authentication.getName())
                .map(User::getId)
                .orElse(null);
    }

    /**
     * Kiểm tra người dùng hiện tại có vai trò {@code admin} hoặc {@code moderator}.
     * Đây là cổng kiểm tra quyền duy nhất cho toàn bộ controller.
     *
     * @return {@code true} nếu có quyền kiểm duyệt; {@code false} nếu không.
     */
    private boolean isModerator(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return false;
        }
        return userRepository.findByUsername(authentication.getName())
                .map(user -> user.getRole() == UserRole.admin || user.getRole() == UserRole.moderator)
                .orElse(false);
    }
}
