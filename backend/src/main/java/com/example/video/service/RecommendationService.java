package com.example.video.service;

import com.example.video.dto.VideoFeedItem;
import com.example.video.model.*;
import com.example.video.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
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

    @Autowired
    private VideoTagRepository videoTagRepository;

    // Weights for scoring
    private static final double VIEW_WEIGHT = 1.0;
    private static final double LIKE_WEIGHT = 3.0;
    private static final double SHARE_WEIGHT = 5.0;
    private static final double DECAY_FACTOR = 0.1; // Per hour
    private static final double RANDOM_FACTOR = 0.2; // 20% randomness for cold start

    public List<VideoFeedItem> getRecommendedFeed(UUID currentUserId, int page, int size) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.max(size, 1);
        List<UUID> recommendedIds = videoRepository.findRecommendedVideoIds(safeSize, safePage * safeSize);
        if (recommendedIds.isEmpty()) {
            return Collections.emptyList();
        }

        Map<UUID, Integer> positionById = new HashMap<>();
        for (int index = 0; index < recommendedIds.size(); index++) {
            positionById.put(recommendedIds.get(index), index);
        }

        List<Video> pageVideos = videoRepository.findAllWithUserByIdIn(recommendedIds).stream()
                .sorted(Comparator.comparingInt(video -> positionById.getOrDefault(video.getId(), Integer.MAX_VALUE)))
                .collect(Collectors.toList());

        FeedContext context = buildFeedContext(pageVideos, currentUserId);

        return pageVideos.stream()
                .map(video -> convertToFeedItem(video, calculateScore(video, context), currentUserId, context))
                .collect(Collectors.toList());
    }

    public List<VideoFeedItem> toFeedItems(List<Video> videos, UUID currentUserId) {
        if (videos == null || videos.isEmpty()) {
            return Collections.emptyList();
        }

        FeedContext context = buildFeedContext(videos, currentUserId);
        return videos.stream()
                .map(video -> convertToFeedItem(video, calculateScore(video, context), currentUserId, context))
                .collect(Collectors.toList());
    }

    public VideoFeedItem toFeedItem(Video video, UUID currentUserId) {
        return toFeedItems(List.of(video), currentUserId).stream()
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Video not found"));
    }

    public List<Video> getRecentActiveVideos(int limit) {
        return videoRepository.findByStatusWithUserOrderByCreatedAtDesc(
                VideoStatus.active,
                PageRequest.of(0, Math.max(limit, 1))
        );
    }

    private FeedContext buildFeedContext(List<Video> videos, UUID currentUserId) {
        if (videos == null || videos.isEmpty()) {
            return FeedContext.empty();
        }

        LinkedHashSet<UUID> videoIds = videos.stream()
                .map(Video::getId)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        LinkedHashSet<UUID> ownerIds = videos.stream()
                .map(Video::getUser)
                .filter(Objects::nonNull)
                .map(User::getId)
                .collect(Collectors.toCollection(LinkedHashSet::new));

        Map<UUID, VideoStats> statsByVideoId = videoStatsRepository.findByVideoIdIn(videoIds).stream()
                .collect(Collectors.toMap(VideoStats::getVideoId, value -> value));
        Map<UUID, List<String>> hashtagsByVideoId = videoTagRepository.findByVideoIdInAndTagCategory(videoIds, "hashtag")
                .stream()
                .filter(videoTag -> videoTag.getTag() != null)
                .collect(Collectors.groupingBy(
                        VideoTag::getVideoId,
                        Collectors.collectingAndThen(
                                Collectors.mapping(videoTag -> videoTag.getTag().getName(),
                                        Collectors.toCollection(TreeSet::new)),
                                ArrayList::new
                        )));

        Set<UUID> likedVideoIds = Collections.emptySet();
        Set<UUID> followedUserIds = Collections.emptySet();
        if (currentUserId != null) {
            likedVideoIds = new HashSet<>(likeRepository.findVideoIdsByUserIdAndVideoIdIn(currentUserId, videoIds));
            followedUserIds = new HashSet<>(followRepository.findFollowingIdsByFollowerIdAndFollowingIdIn(currentUserId, ownerIds));
        }

        return new FeedContext(statsByVideoId, hashtagsByVideoId, likedVideoIds, followedUserIds);
    }

    private double calculateScore(Video video, FeedContext context) {
        VideoStats stats = context.statsByVideoId.getOrDefault(video.getId(), createDefaultStats(video.getId()));

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

    private VideoFeedItem convertToFeedItem(Video video, double score, UUID currentUserId, FeedContext context) {
        VideoFeedItem item = new VideoFeedItem();
        item.setId(video.getId());
        item.setTitle(video.getTitle());
        item.setDescription(video.getDescription());
        item.setVideoUrl(video.getVideoUrl());
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
            userSummary.setFollowedByCurrentUser(context.followedUserIds.contains(video.getUser().getId()));
        }
        item.setUser(userSummary);

        VideoStats stats = context.statsByVideoId.getOrDefault(video.getId(), createDefaultStats(video.getId()));
        VideoFeedItem.VideoStatsDto statsDto = new VideoFeedItem.VideoStatsDto();
        statsDto.setViewCount(stats.getViewCount() != null ? stats.getViewCount() : 0);
        statsDto.setLikeCount(stats.getLikeCount() != null ? stats.getLikeCount() : 0);
        statsDto.setCommentCount(stats.getCommentCount() != null ? stats.getCommentCount() : 0);
        statsDto.setShareCount(stats.getShareCount() != null ? stats.getShareCount() : 0);
        item.setStats(statsDto);

        item.setHashtags(context.hashtagsByVideoId.getOrDefault(video.getId(), Collections.emptyList()));

        if (currentUserId != null) {
            item.setLikedByCurrentUser(context.likedVideoIds.contains(video.getId()));
        }

        return item;
    }

    private static class FeedContext {
        private final Map<UUID, VideoStats> statsByVideoId;
        private final Map<UUID, List<String>> hashtagsByVideoId;
        private final Set<UUID> likedVideoIds;
        private final Set<UUID> followedUserIds;

        private FeedContext(Map<UUID, VideoStats> statsByVideoId,
                            Map<UUID, List<String>> hashtagsByVideoId,
                            Set<UUID> likedVideoIds,
                            Set<UUID> followedUserIds) {
            this.statsByVideoId = statsByVideoId;
            this.hashtagsByVideoId = hashtagsByVideoId;
            this.likedVideoIds = likedVideoIds;
            this.followedUserIds = followedUserIds;
        }

        private static FeedContext empty() {
            return new FeedContext(
                    Collections.emptyMap(),
                    Collections.emptyMap(),
                    Collections.emptySet(),
                    Collections.emptySet()
            );
        }
    }
}
