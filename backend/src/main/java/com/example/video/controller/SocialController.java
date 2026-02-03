package com.example.video.controller;

import com.example.video.dto.CommentRequest;
import com.example.video.dto.CommentResponse;
import com.example.video.model.User;
import com.example.video.repository.UserRepository;
import com.example.video.service.SocialService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/social")
@CrossOrigin(origins = "*")
public class SocialController {

    @Autowired
    private SocialService socialService;

    @Autowired
    private UserRepository userRepository;

    // ==================== LIKE ====================

    @PostMapping("/like/{videoId}")
    public ResponseEntity<Map<String, Object>> toggleLike(
            @PathVariable UUID videoId,
            Authentication authentication) {
        
        UUID userId = getCurrentUserId(authentication);
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Please login first"));
        }

        boolean isLiked = socialService.toggleLike(userId, videoId);
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("liked", isLiked);
        response.put("message", isLiked ? "Video liked" : "Video unliked");
        return ResponseEntity.ok(response);
    }

    @GetMapping("/like/{videoId}/status")
    public ResponseEntity<Map<String, Object>> getLikeStatus(
            @PathVariable UUID videoId,
            Authentication authentication) {
        
        UUID userId = getCurrentUserId(authentication);
        boolean isLiked = userId != null && socialService.isLiked(userId, videoId);
        
        return ResponseEntity.ok(Map.of("liked", isLiked));
    }

    // ==================== COMMENT ====================

    @PostMapping("/comment")
    public ResponseEntity<CommentResponse> addComment(
            @RequestBody CommentRequest request,
            Authentication authentication) {
        
        UUID userId = getCurrentUserId(authentication);
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }

        CommentResponse response = socialService.addComment(userId, request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/comments/{videoId}")
    public ResponseEntity<List<CommentResponse>> getComments(
            @PathVariable UUID videoId,
            @RequestParam(defaultValue = "false") boolean nested) {
        
        List<CommentResponse> comments = socialService.getComments(videoId, nested);
        return ResponseEntity.ok(comments);
    }

    @DeleteMapping("/comment/{commentId}")
    public ResponseEntity<Map<String, Object>> deleteComment(
            @PathVariable UUID commentId,
            Authentication authentication) {
        
        UUID userId = getCurrentUserId(authentication);
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Please login first"));
        }

        socialService.deleteComment(commentId, userId);
        return ResponseEntity.ok(Map.of("success", true, "message", "Comment deleted"));
    }

    // ==================== FOLLOW ====================

    @PostMapping("/follow/{targetUserId}")
    public ResponseEntity<Map<String, Object>> toggleFollow(
            @PathVariable UUID targetUserId,
            Authentication authentication) {
        
        UUID userId = getCurrentUserId(authentication);
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Please login first"));
        }

        boolean isFollowing = socialService.toggleFollow(userId, targetUserId);
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("following", isFollowing);
        response.put("message", isFollowing ? "Now following" : "Unfollowed");
        return ResponseEntity.ok(response);
    }

    @GetMapping("/follow/{targetUserId}/status")
    public ResponseEntity<Map<String, Object>> getFollowStatus(
            @PathVariable UUID targetUserId,
            Authentication authentication) {
        
        UUID userId = getCurrentUserId(authentication);
        boolean isFollowing = userId != null && socialService.isFollowing(userId, targetUserId);
        long followerCount = socialService.getFollowerCount(targetUserId);
        
        Map<String, Object> response = new HashMap<>();
        response.put("following", isFollowing);
        response.put("followerCount", followerCount);
        return ResponseEntity.ok(response);
    }

    // ==================== SHARE ====================

    @PostMapping("/share/{videoId}")
    public ResponseEntity<Map<String, Object>> shareVideo(@PathVariable UUID videoId) {
        String shareLink = socialService.generateShareLink(videoId);
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("shareLink", shareLink);
        response.put("deepLink", shareLink);
        return ResponseEntity.ok(response);
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
