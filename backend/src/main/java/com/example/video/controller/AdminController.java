package com.example.video.controller;

import com.example.video.dto.CreatorDashboard;
import com.example.video.dto.ReportRequest;
import com.example.video.dto.UpdateProfileRequest;
import com.example.video.dto.UserCardResponse;
import com.example.video.dto.UserProfile;
import com.example.video.dto.VideoFeedItem;
import com.example.video.model.Report;
import com.example.video.model.User;
import com.example.video.model.UserRole;
import com.example.video.repository.UserRepository;
import com.example.video.service.AdminService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Controller đa năng phục vụ quản lý báo cáo vi phạm, hồ sơ người dùng và dashboard creator.
 *
 * <p>Nhóm endpoint:
 * <ul>
 *   <li><b>Báo cáo vi phạm (user):</b> {@code POST /api/report} — Bất kỳ user đã đăng nhập đều có thể báo cáo.</li>
 *   <li><b>Quản trị báo cáo (admin/moderator):</b>
 *     {@code GET /api/admin/reports}, {@code POST /api/admin/reports/{id}/resolve},
 *     {@code POST /api/admin/videos/{id}/hide|unhide}, {@code POST /api/admin/users/{id}/ban}.</li>
 *   <li><b>Creator dashboard:</b> {@code GET /api/dashboard} — Thống kê view/like/comment/share của creator.</li>
 *   <li><b>Hồ sơ người dùng:</b> {@code GET /api/users/{id}/profile}, {@code GET /api/profile},
 *     {@code PUT /api/profile}, {@code GET /api/users/{id}/videos},
 *     {@code GET /api/users/{id}/followers|following}.</li>
 * </ul>
 *
 * <p>Khi người dùng báo cáo video ({@code POST /api/report}), hệ thống tự động tạo hoặc
 * leo thang (escalate) bản ghi trong hàng chờ kiểm duyệt ({@code ModerationQueue}).
 */
@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class AdminController {

    @Autowired
    private AdminService adminService;

    @Autowired
    private UserRepository userRepository;

    // ==================== REPORT ====================

    /**
     * Báo cáo video vi phạm. Mỗi cặp (user, video) chỉ được báo cáo một lần.
     * Hệ thống tự động tạo hoặc leo thang hàng chờ kiểm duyệt với priority=high.
     *
     * @param request        thông tin báo cáo (videoId, reason)
     * @param authentication thông tin người dùng đang đăng nhập (bắt buộc)
     * @return JSON {@code {success, message, reportId}}
     */
    @PostMapping("/report")
    public ResponseEntity<?> reportVideo(
            @RequestBody ReportRequest request,
            Authentication authentication) {
        
        UUID userId = getCurrentUserId(authentication);
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Please login first"));
        }

        try {
            Report report = adminService.createReport(userId, request.getVideoId(), request.getReason());
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Report submitted successfully",
                    "reportId", report.getId()
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ==================== ADMIN MODERATION ====================

    /**
     * Lấy danh sách báo cáo vi phạm (admin/moderator only).
     *
     * @param status         lọc theo trạng thái: "open" hoặc null (lấy tất cả)
     * @param authentication thông tin người dùng (phải là admin hoặc moderator)
     * @return danh sách Report, hoặc 403 nếu không đủ quyền
     */
    @GetMapping("/admin/reports")
    public ResponseEntity<?> getReports(
            @RequestParam(required = false) String status,
            Authentication authentication) {
        
        if (!isAdmin(authentication)) {
            return ResponseEntity.status(403).body(Map.of("error", "Admin access required"));
        }

        List<Report> reports = status != null && status.equals("open") 
                ? adminService.getOpenReports() 
                : adminService.getAllReports();
        return ResponseEntity.ok(reports);
    }

    /**
     * Xử lý báo cáo vi phạm với một trong ba hành động (admin/moderator only).
     *
     * @param reportId       ID báo cáo cần xử lý
     * @param action         hành động: "dismiss" (bác bỏ), "hide" (ẩn video), "ban" (cấm user)
     * @param authentication thông tin người dùng (phải là admin hoặc moderator)
     * @return JSON {@code {success, message}} hoặc 403
     */
    @PostMapping("/admin/reports/{reportId}/resolve")
    public ResponseEntity<?> resolveReport(
            @PathVariable UUID reportId,
            @RequestParam String action, // dismiss, hide, ban
            Authentication authentication) {
        
        if (!isAdmin(authentication)) {
            return ResponseEntity.status(403).body(Map.of("error", "Admin access required"));
        }

        try {
            adminService.resolveReport(reportId, action);
            return ResponseEntity.ok(Map.of("success", true, "message", "Report resolved with action: " + action));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/admin/videos/{videoId}/hide")
    public ResponseEntity<?> hideVideo(
            @PathVariable UUID videoId,
            Authentication authentication) {
        
        if (!isAdmin(authentication)) {
            return ResponseEntity.status(403).body(Map.of("error", "Admin access required"));
        }

        adminService.hideVideo(videoId);
        return ResponseEntity.ok(Map.of("success", true, "message", "Video hidden"));
    }

    @PostMapping("/admin/videos/{videoId}/unhide")
    public ResponseEntity<?> unhideVideo(
            @PathVariable UUID videoId,
            Authentication authentication) {
        
        if (!isAdmin(authentication)) {
            return ResponseEntity.status(403).body(Map.of("error", "Admin access required"));
        }

        adminService.unhideVideo(videoId);
        return ResponseEntity.ok(Map.of("success", true, "message", "Video unhidden"));
    }

    @PostMapping("/admin/users/{userId}/ban")
    public ResponseEntity<?> banUser(
            @PathVariable UUID userId,
            Authentication authentication) {
        
        if (!isAdmin(authentication)) {
            return ResponseEntity.status(403).body(Map.of("error", "Admin access required"));
        }

        adminService.banUser(userId);
        return ResponseEntity.ok(Map.of("success", true, "message", "User banned"));
    }

    // ==================== CREATOR DASHBOARD ====================

    /**
     * Lấy dashboard thống kê của creator: tổng view/like/comment/share,
     * follower count và top 10 video theo lượt xem.
     *
     * @param authentication thông tin người dùng đang đăng nhập (bắt buộc)
     * @return CreatorDashboard với các chỉ số tổng hợp
     */
    @GetMapping("/dashboard")
    public ResponseEntity<?> getCreatorDashboard(Authentication authentication) {
        UUID userId = getCurrentUserId(authentication);
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Please login first"));
        }

        CreatorDashboard dashboard = adminService.getCreatorDashboard(userId);
        return ResponseEntity.ok(dashboard);
    }

    // ==================== USER PROFILE ====================

    /**
     * Lấy hồ sơ công khai của người dùng theo ID.
     * Email chỉ trả về khi người dùng xem hồ sơ của chính mình.
     *
     * @param userId         ID người dùng cần xem
     * @param authentication thông tin người dùng hiện tại (có thể null)
     * @return UserProfile với thông tin công khai và trạng thái follow
     */
    @GetMapping("/users/{userId}/profile")
    public ResponseEntity<?> getUserProfile(
            @PathVariable UUID userId,
            Authentication authentication) {
        
        UUID currentUserId = getCurrentUserId(authentication);
        UserProfile profile = adminService.getUserProfile(userId, currentUserId);
        return ResponseEntity.ok(profile);
    }

    @GetMapping("/profile")
    public ResponseEntity<?> getMyProfile(Authentication authentication) {
        UUID userId = getCurrentUserId(authentication);
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Please login first"));
        }

        UserProfile profile = adminService.getUserProfile(userId, userId);
        return ResponseEntity.ok(profile);
    }

    /**
     * Cập nhật hồ sơ của người dùng hiện tại (username, bio, avatarUrl).
     * Kiểm tra trùng username trước khi thay đổi.
     *
     * @param request        thông tin cần cập nhật (có thể để null để giữ nguyên)
     * @param authentication thông tin người dùng đang đăng nhập (bắt buộc)
     * @return UserProfile sau khi cập nhật
     */
    @PutMapping("/profile")
    public ResponseEntity<?> updateMyProfile(
            @RequestBody UpdateProfileRequest request,
            Authentication authentication) {
        UUID userId = getCurrentUserId(authentication);
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Please login first"));
        }

        try {
            return ResponseEntity.ok(adminService.updateProfile(userId, request));
        } catch (RuntimeException exception) {
            return ResponseEntity.badRequest().body(Map.of("error", exception.getMessage()));
        }
    }

    @GetMapping("/users/{userId}/videos")
    public ResponseEntity<List<VideoFeedItem>> getUserVideos(
            @PathVariable UUID userId,
            Authentication authentication) {
        UUID currentUserId = getCurrentUserId(authentication);
        return ResponseEntity.ok(adminService.getUserVideos(userId, currentUserId));
    }

    @GetMapping("/users/{userId}/followers")
    public ResponseEntity<List<UserCardResponse>> getFollowers(
            @PathVariable UUID userId,
            Authentication authentication) {
        UUID currentUserId = getCurrentUserId(authentication);
        return ResponseEntity.ok(adminService.getFollowers(userId, currentUserId));
    }

    @GetMapping("/users/{userId}/following")
    public ResponseEntity<List<UserCardResponse>> getFollowing(
            @PathVariable UUID userId,
            Authentication authentication) {
        UUID currentUserId = getCurrentUserId(authentication);
        return ResponseEntity.ok(adminService.getFollowing(userId, currentUserId));
    }

    @GetMapping("/profile/videos")
    public ResponseEntity<?> getMyVideos(Authentication authentication) {
        UUID userId = getCurrentUserId(authentication);
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Please login first"));
        }

        return ResponseEntity.ok(adminService.getUserVideos(userId, userId));
    }

    /** Lấy UUID của người dùng hiện tại từ JWT, trả về null nếu chưa đăng nhập. */
    private UUID getCurrentUserId(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return null;
        }
        return userRepository.findByUsername(authentication.getName())
                .map(User::getId)
                .orElse(null);
    }

    /** Kiểm tra người dùng hiện tại có role admin hoặc moderator không. */
    private boolean isAdmin(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return false;
        }
        return userRepository.findByUsername(authentication.getName())
                .map(user -> user.getRole() == UserRole.admin || user.getRole() == UserRole.moderator)
                .orElse(false);
    }
}
