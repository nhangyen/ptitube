package com.example.video.controller;

import com.example.video.dto.CreatorDashboard;
import com.example.video.dto.ReportRequest;
import com.example.video.dto.UserProfile;
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

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class AdminController {

    @Autowired
    private AdminService adminService;

    @Autowired
    private UserRepository userRepository;

    // ==================== REPORT ====================

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

    private UUID getCurrentUserId(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return null;
        }
        return userRepository.findByUsername(authentication.getName())
                .map(User::getId)
                .orElse(null);
    }

    private boolean isAdmin(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return false;
        }
        return userRepository.findByUsername(authentication.getName())
                .map(user -> user.getRole() == UserRole.admin || user.getRole() == UserRole.moderator)
                .orElse(false);
    }
}
