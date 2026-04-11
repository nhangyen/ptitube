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

    @GetMapping("/stats")
    public ResponseEntity<?> getQueueStats(Authentication authentication) {
        if (!isModerator(authentication)) {
            return ResponseEntity.status(403).body(Map.of("error", "Access denied"));
        }
        return ResponseEntity.ok(moderationService.getQueueStats());
    }

    // ==================== QUEUE ====================

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

    @GetMapping("/queue/{queueId}")
    public ResponseEntity<?> getQueueItem(@PathVariable UUID queueId, Authentication authentication) {
        if (!isModerator(authentication)) {
            return ResponseEntity.status(403).body(Map.of("error", "Access denied"));
        }
        ModerationQueueResponse item = moderationService.getQueueItem(queueId);
        return ResponseEntity.ok(item);
    }

    @GetMapping("/queue/{queueId}/scenes")
    public ResponseEntity<?> getVideoScenes(@PathVariable UUID queueId, Authentication authentication) {
        if (!isModerator(authentication)) {
            return ResponseEntity.status(403).body(Map.of("error", "Access denied"));
        }
        List<SceneDetailResponse> scenes = moderationService.getVideoScenes(queueId);
        return ResponseEntity.ok(scenes);
    }

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

    @GetMapping("/queue/{queueId}/reports")
    public ResponseEntity<?> getVideoReports(@PathVariable UUID queueId, Authentication authentication) {
        if (!isModerator(authentication)) {
            return ResponseEntity.status(403).body(Map.of("error", "Access denied"));
        }
        return ResponseEntity.ok(moderationService.getVideoReports(queueId));
    }

    // ==================== SCENE TAGS ====================

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

    @GetMapping("/tags")
    public ResponseEntity<?> getAllTags(Authentication authentication) {
        if (!isModerator(authentication)) {
            return ResponseEntity.status(403).body(Map.of("error", "Access denied"));
        }
        List<Tag> tags = tagService.getAllActiveTags();
        return ResponseEntity.ok(tags);
    }

    @PostMapping("/tags")
    public ResponseEntity<?> createTag(@RequestBody Map<String, String> body, Authentication authentication) {
        if (!isModerator(authentication)) {
            return ResponseEntity.status(403).body(Map.of("error", "Access denied"));
        }
        Tag tag = tagService.createTag(body.get("name"), body.get("category"));
        return ResponseEntity.ok(tag);
    }

    // ==================== AI JOBS ====================

    @GetMapping("/jobs/{videoId}")
    public ResponseEntity<?> getAiJobs(@PathVariable UUID videoId, Authentication authentication) {
        if (!isModerator(authentication)) {
            return ResponseEntity.status(403).body(Map.of("error", "Access denied"));
        }
        List<AiAnalysisJob> jobs = aiJobRepository.findByVideoId(videoId);
        return ResponseEntity.ok(jobs);
    }

    // ==================== HELPERS ====================

    private UUID getCurrentUserId(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return null;
        }
        return userRepository.findByUsername(authentication.getName())
                .map(User::getId)
                .orElse(null);
    }

    private boolean isModerator(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return false;
        }
        return userRepository.findByUsername(authentication.getName())
                .map(user -> user.getRole() == UserRole.admin || user.getRole() == UserRole.moderator)
                .orElse(false);
    }
}
