package com.example.video.service;

import com.example.video.dto.VideoFeedItem;
import com.example.video.model.*;
import com.example.video.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Recommendation Engine using Weighted Scoring Algorithm
 * Score = (Views × 1) + (Likes × 3) + (Shares × 5) - (Decay_Time) + Random
 */
@Service
public class RecommendationService {

    @Autowired
    private VideoRepository videoRepository;

    @Autowired
    private VideoStatsRepository videoStatsRepository;

    @Autowired
    private LikeRepository likeRepository;

    @Autowired
    private FollowRepository followRepository;

    // Weights for scoring
    private static final double VIEW_WEIGHT = 1.0;
    private static final double LIKE_WEIGHT = 3.0;
    private static final double SHARE_WEIGHT = 5.0;
    private static final double DECAY_FACTOR = 0.1; // Per hour
    private static final double RANDOM_FACTOR = 0.2; // 20% randomness for cold start

    public List<VideoFeedItem> getRecommendedFeed(UUID currentUserId, int page, int size) {
        List<Video> allVideos = videoRepository.findAll();
        
        // Filter only active videos
        List<Video> activeVideos = allVideos.stream()
                .filter(v -> v.getStatus() == VideoStatus.active)
                .collect(Collectors.toList());

        // Calculate scores
        List<ScoredVideo> scoredVideos = activeVideos.stream()
                .map(video -> {
                    double score = calculateScore(video);
                    return new ScoredVideo(video, score);
                })
                .sorted((a, b) -> Double.compare(b.score, a.score)) // Sort by score descending
                .collect(Collectors.toList());

        // Apply pagination
        int start = page * size;
        int end = Math.min(start + size, scoredVideos.size());
        
        if (start >= scoredVideos.size()) {
            return Collections.emptyList();
        }

        List<ScoredVideo> pageVideos = scoredVideos.subList(start, end);

        // Convert to VideoFeedItem
        return pageVideos.stream()
                .map(sv -> convertToFeedItem(sv.video, sv.score, currentUserId))
                .collect(Collectors.toList());
    }

    private double calculateScore(Video video) {
        // Get stats
        VideoStats stats = videoStatsRepository.findByVideoId(video.getId())
                .orElse(createDefaultStats(video.getId()));

        long views = stats.getViewCount() != null ? stats.getViewCount() : 0;
        long likes = stats.getLikeCount() != null ? stats.getLikeCount() : 0;
        long shares = stats.getShareCount() != null ? stats.getShareCount() : 0;

        // Calculate time decay (hours since creation)
        long hoursOld = ChronoUnit.HOURS.between(video.getCreatedAt(), LocalDateTime.now());
        double timeDecay = hoursOld * DECAY_FACTOR;

        // Base score
        double baseScore = (views * VIEW_WEIGHT) + (likes * LIKE_WEIGHT) + (shares * SHARE_WEIGHT) - timeDecay;

        // Add randomness for cold start / content discovery
        double randomBoost = Math.random() * (baseScore * RANDOM_FACTOR + 10); // Add some base random for new videos

        return Math.max(0, baseScore + randomBoost);
    }

    private VideoStats createDefaultStats(UUID videoId) {
        VideoStats stats = new VideoStats();
        stats.setVideoId(videoId);
        stats.setViewCount(0L);
        stats.setLikeCount(0L);
        stats.setCommentCount(0L);
        stats.setShareCount(0L);
        return stats;
    }

    private VideoFeedItem convertToFeedItem(Video video, double score, UUID currentUserId) {
        VideoFeedItem item = new VideoFeedItem();
        item.setId(video.getId());
        item.setTitle(video.getTitle());
        item.setDescription(video.getDescription());
        item.setVideoUrl("/api/videos/stream/" + video.getId());
        item.setThumbnailUrl(video.getThumbnailUrl());
        item.setDurationSeconds(video.getDurationSeconds());
        item.setCreatedAt(video.getCreatedAt().toString());
        item.setScore(score);

        // User summary
        VideoFeedItem.UserSummary userSummary = new VideoFeedItem.UserSummary();
        userSummary.setId(video.getUser().getId());
        userSummary.setUsername(video.getUser().getUsername());
        userSummary.setAvatarUrl(video.getUser().getAvatarUrl());
        
        if (currentUserId != null) {
            userSummary.setFollowedByCurrentUser(
                    followRepository.existsByFollowerIdAndFollowingId(currentUserId, video.getUser().getId())
            );
        }
        item.setUser(userSummary);

        // Stats
        VideoStats stats = videoStatsRepository.findByVideoId(video.getId())
                .orElse(createDefaultStats(video.getId()));
        
        VideoFeedItem.VideoStatsDto statsDto = new VideoFeedItem.VideoStatsDto();
        statsDto.setViewCount(stats.getViewCount() != null ? stats.getViewCount() : 0);
        statsDto.setLikeCount(stats.getLikeCount() != null ? stats.getLikeCount() : 0);
        statsDto.setCommentCount(stats.getCommentCount() != null ? stats.getCommentCount() : 0);
        statsDto.setShareCount(stats.getShareCount() != null ? stats.getShareCount() : 0);
        item.setStats(statsDto);

        // Check if current user liked
        if (currentUserId != null) {
            item.setLikedByCurrentUser(likeRepository.existsByUserIdAndVideoId(currentUserId, video.getId()));
        }

        return item;
    }

    private static class ScoredVideo {
        Video video;
        double score;

        ScoredVideo(Video video, double score) {
            this.video = video;
            this.score = score;
        }
    }
}
