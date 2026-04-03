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

@RestController
@RequestMapping("/api/notifications")
@CrossOrigin(origins = "*")
public class NotificationController {

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private UserRepository userRepository;

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

    @GetMapping("/unread-count")
    public ResponseEntity<?> getUnreadCount(Authentication authentication) {
        UUID userId = getCurrentUserId(authentication);
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Please login first"));
        }
        return ResponseEntity.ok(Map.of("count", notificationService.getUnreadCount(userId)));
    }

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
