package com.example.video.controller;

import com.example.video.dto.VideoFeedItem;
import com.example.video.model.User;
import com.example.video.repository.UserRepository;
import com.example.video.service.RecommendationService;
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
@RequestMapping("/api/feed")
@CrossOrigin(origins = "*")
public class FeedController {

    @Autowired
    private RecommendationService recommendationService;

    @Autowired
    private SocialService socialService;

    @Autowired
    private UserRepository userRepository;

    /**
     * Get recommended video feed with weighted scoring
     * Score = (Views × 1) + (Likes × 3) + (Shares × 5) - (Decay_Time) + Random
     */
    @GetMapping
    public ResponseEntity<List<VideoFeedItem>> getFeed(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            Authentication authentication) {
        
        UUID currentUserId = getCurrentUserId(authentication);
        List<VideoFeedItem> feed = recommendationService.getRecommendedFeed(currentUserId, page, size);
        return ResponseEntity.ok(feed);
    }

    /**
     * Record video view for analytics
     */
    @PostMapping("/view/{videoId}")
    public ResponseEntity<Map<String, Object>> recordView(
            @PathVariable UUID videoId,
            @RequestParam(defaultValue = "0") int watchDuration,
            @RequestParam(defaultValue = "false") boolean completed,
            Authentication authentication) {
        
        UUID currentUserId = getCurrentUserId(authentication);
        socialService.recordView(videoId, currentUserId, watchDuration, completed);
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "View recorded");
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
