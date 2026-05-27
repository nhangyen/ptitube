package com.example.video.controller;

import com.example.video.dto.NotificationResponse;
import com.example.video.model.User;
import com.example.video.repository.UserRepository;
import com.example.video.service.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Controller quản lý thông báo trong ứng dụng.
 *
 * <p>Thông báo được tạo tự động bởi {@link com.example.video.service.NotificationService}
 * khi có các sự kiện: like, comment, reply, follow.
 *
 * <p>Danh sách endpoint (tất cả yêu cầu JWT):
 * <ul>
 *   <li>{@code GET  /api/notifications} — Lấy danh sách thông báo phân trang (mới nhất trước).</li>
 *   <li>{@code GET  /api/notifications/unread-count} — Số thông báo chưa đọc (dùng cho badge icon).</li>
 *   <li>{@code POST /api/notifications/{id}/read} — Đánh dấu một thông báo đã đọc.</li>
 *   <li>{@code POST /api/notifications/read-all} — Đánh dấu tất cả thông báo đã đọc.</li>
 * </ul>
 */
@RestController
@RequestMapping("/api/notifications")
@CrossOrigin(origins = "*")
public class NotificationController {

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private UserRepository userRepository;

    /**
     * Lấy danh sách thông báo của người dùng hiện tại, phân trang, mới nhất trước.
     *
     * @param page           số trang (bắt đầu từ 0)
     * @param size           số thông báo mỗi trang (mặc định 20)
     * @param authentication thông tin người dùng đang đăng nhập (bắt buộc)
     * @return danh sách NotificationResponse
     */
    @GetMapping
    public ResponseEntity<?> getNotifications(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication authentication) {
        UUID userId = getCurrentUserId(authentication);
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Please login first"));
        }

        List<NotificationResponse> notifications = notificationService.getNotifications(userId, page, size);
        return ResponseEntity.ok(notifications);
    }

    /**
     * Trả về số lượng thông báo chưa đọc. Dùng để hiển thị badge trên icon thông báo.
     *
     * @param authentication thông tin người dùng đang đăng nhập (bắt buộc)
     * @return JSON {@code {count: long}}
     */
    @GetMapping("/unread-count")
    public ResponseEntity<?> getUnreadCount(Authentication authentication) {
        UUID userId = getCurrentUserId(authentication);
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Please login first"));
        }
        return ResponseEntity.ok(Map.of("count", notificationService.getUnreadCount(userId)));
    }

    /**
     * Đánh dấu một thông báo cụ thể là đã đọc. Chỉ chủ thông báo mới được phép.
     *
     * @param notificationId ID thông báo cần đánh dấu
     * @param authentication thông tin người dùng đang đăng nhập (bắt buộc)
     * @return JSON {@code {success: true}}
     */
    @PostMapping("/{notificationId}/read")
    public ResponseEntity<?> markAsRead(
            @PathVariable UUID notificationId,
            Authentication authentication) {
        UUID userId = getCurrentUserId(authentication);
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Please login first"));
        }
        notificationService.markAsRead(userId, notificationId);
        return ResponseEntity.ok(Map.of("success", true));
    }

    /**
     * Đánh dấu tất cả thông báo chưa đọc của người dùng là đã đọc.
     *
     * @param authentication thông tin người dùng đang đăng nhập (bắt buộc)
     * @return JSON {@code {success: true}}
     */
    @PostMapping("/read-all")
    public ResponseEntity<?> markAllAsRead(Authentication authentication) {
        UUID userId = getCurrentUserId(authentication);
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Please login first"));
        }
        notificationService.markAllAsRead(userId);
        return ResponseEntity.ok(Map.of("success", true));
    }

    private UUID getCurrentUserId(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return null;
        }
        return userRepository.findByUsername(authentication.getName())
                .map(User::getId)
                .orElse(null);
    }
}
