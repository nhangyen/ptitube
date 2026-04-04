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
import java.util.stream.Stream;

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

    @Autowired
    private VideoRepostRepository videoRepostRepository;

    // Weights for scoring
    private static final double VIEW_WEIGHT = 1.0;
    private static final double LIKE_WEIGHT = 3.0;
    private static final double SHARE_WEIGHT = 5.0;
    private static final double DECAY_FACTOR = 0.1; // Per hour
    private static final double RANDOM_FACTOR = 0.2; // 20% randomness for cold start
    private static final double REPOST_BASE_BOOST = 25.0;
    private static final double SELF_REPOST_BOOST = 15.0;

    public List<VideoFeedItem> getRecommendedFeed(UUID currentUserId, int page, int size) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.max(size, 1);
        int fetchSize = Math.max((safePage + 1) * safeSize * 3, safeSize * 3);

        List<FeedCandidate> originalCandidates = getOriginalCandidates(currentUserId, fetchSize);
        List<FeedCandidate> repostCandidates = getRepostCandidates(currentUserId, fetchSize);

        LinkedHashMap<UUID, FeedCandidate> uniqueByVideoId = new LinkedHashMap<>();
        Stream.concat(originalCandidates.stream(), repostCandidates.stream())
                .sorted(Comparator
                        .comparingDouble(FeedCandidate::getRankingScore).reversed()
                        .thenComparing(FeedCandidate::getActivityAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .forEach(candidate -> {
                    UUID videoId = candidate.getVideo().getId();
                    FeedCandidate existing = uniqueByVideoId.get(videoId);
                    if (existing == null || (candidate.isRepost() && !existing.isRepost())) {
                        uniqueByVideoId.put(videoId, candidate);
                    }
                });

        List<FeedCandidate> mergedCandidates = new ArrayList<>(uniqueByVideoId.values());
        int fromIndex = Math.min(safePage * safeSize, mergedCandidates.size());
        int toIndex = Math.min(fromIndex + safeSize, mergedCandidates.size());
        if (fromIndex >= toIndex) {
            return Collections.emptyList();
        }

        List<FeedCandidate> pageCandidates = mergedCandidates.subList(fromIndex, toIndex);
        FeedContext context = buildFeedContext(
                pageCandidates.stream().map(FeedCandidate::getVideo).collect(Collectors.toList()),
                currentUserId
        );

        return pageCandidates.stream()
                .map(candidate -> convertToFeedItem(candidate, currentUserId, context))
                .collect(Collectors.toList());
    }

    public List<VideoFeedItem> toFeedItems(List<Video> videos, UUID currentUserId) {
        if (videos == null || videos.isEmpty()) {
            return Collections.emptyList();
        }

        FeedContext context = buildFeedContext(videos, currentUserId);
        return videos.stream()
                .map(video -> convertToFeedItem(
                        FeedCandidate.original(video, calculateScore(video, context)),
                        currentUserId,
                        context
                ))
                .collect(Collectors.toList());
    }

    public VideoFeedItem toFeedItem(Video video, UUID currentUserId) {
        return toFeedItems(List.of(video), currentUserId).stream()
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Video not found"));
    }

    public VideoFeedItem toFeedItem(Video video, UUID currentUserId, VideoRepost repost) {
        FeedContext context = buildFeedContext(List.of(video), currentUserId);
        return convertToFeedItem(
                FeedCandidate.repost(video, repost, calculateRepostScore(video, repost, currentUserId, context)),
                currentUserId,
                context
        );
    }

    public List<VideoFeedItem> toProfileActivityItems(List<Video> uploads,
                                                      List<VideoRepost> reposts,
                                                      UUID currentUserId) {
        List<FeedCandidate> candidates = new ArrayList<>();
        if (uploads != null) {
            uploads.forEach(video -> candidates.add(FeedCandidate.original(video, 0)));
        }
        if (reposts != null) {
            reposts.forEach(repost -> candidates.add(FeedCandidate.repost(repost.getVideo(), repost, 0)));
        }
        if (candidates.isEmpty()) {
            return Collections.emptyList();
        }

        candidates.sort(Comparator.comparing(FeedCandidate::getActivityAt, Comparator.nullsLast(Comparator.reverseOrder())));
        FeedContext context = buildFeedContext(
                candidates.stream().map(FeedCandidate::getVideo).collect(Collectors.toList()),
                currentUserId
        );

        return candidates.stream()
                .map(candidate -> convertToFeedItem(candidate, currentUserId, context))
                .collect(Collectors.toList());
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
        Set<UUID> currentUserRepostedVideoIds = Collections.emptySet();
        if (currentUserId != null) {
            likedVideoIds = new HashSet<>(likeRepository.findVideoIdsByUserIdAndVideoIdIn(currentUserId, videoIds));
            followedUserIds = new HashSet<>(followRepository.findFollowingIdsByFollowerIdAndFollowingIdIn(currentUserId, ownerIds));
            currentUserRepostedVideoIds = new HashSet<>(videoRepostRepository.findVideoIdsByUserIdAndVideoIdIn(currentUserId, videoIds));
        }

        Map<UUID, Long> repostCountByVideoId = videoRepostRepository.countByVideoIds(videoIds).stream()
                .collect(Collectors.toMap(
                        row -> (UUID) row[0],
                        row -> ((Number) row[1]).longValue()
                ));

        return new FeedContext(
                statsByVideoId,
                hashtagsByVideoId,
                likedVideoIds,
                followedUserIds,
                currentUserRepostedVideoIds,
                repostCountByVideoId
        );
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

    private List<FeedCandidate> getOriginalCandidates(UUID currentUserId, int fetchSize) {
        List<UUID> originalIds = videoRepository.findRecommendedVideoIds(fetchSize, 0);
        if (originalIds.isEmpty()) {
            return Collections.emptyList();
        }

        Map<UUID, Integer> positionById = new HashMap<>();
        for (int index = 0; index < originalIds.size(); index++) {
            positionById.put(originalIds.get(index), index);
        }

        List<Video> videos = videoRepository.findAllWithUserByIdIn(originalIds).stream()
                .sorted(Comparator.comparingInt(video -> positionById.getOrDefault(video.getId(), Integer.MAX_VALUE)))
                .collect(Collectors.toList());
        FeedContext context = buildFeedContext(videos, currentUserId);

        return videos.stream()
                .map(video -> FeedCandidate.original(video, calculateScore(video, context)))
                .collect(Collectors.toList());
    }

    private List<FeedCandidate> getRepostCandidates(UUID currentUserId, int fetchSize) {
        if (currentUserId == null) {
            return Collections.emptyList();
        }

        LinkedHashSet<UUID> networkUserIds = followRepository.findByFollowerIdOrderByCreatedAtDesc(currentUserId).stream()
                .map(Follow::getFollowingId)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        networkUserIds.add(currentUserId);

        if (networkUserIds.isEmpty()) {
            return Collections.emptyList();
        }

        List<VideoRepost> reposts = videoRepostRepository.findActiveByUserIdsOrderByCreatedAtDesc(
                networkUserIds,
                VideoStatus.active,
                PageRequest.of(0, fetchSize)
        );
        if (reposts.isEmpty()) {
            return Collections.emptyList();
        }

        FeedContext context = buildFeedContext(
                reposts.stream().map(VideoRepost::getVideo).collect(Collectors.toList()),
                currentUserId
        );

        return reposts.stream()
                .map(repost -> FeedCandidate.repost(
                        repost.getVideo(),
                        repost,
                        calculateRepostScore(repost.getVideo(), repost, currentUserId, context)
                ))
                .collect(Collectors.toList());
    }

    private double calculateRepostScore(Video video, VideoRepost repost, UUID currentUserId, FeedContext context) {
        double score = calculateScore(video, context) + REPOST_BASE_BOOST;
        long hoursOld = Math.max(0, ChronoUnit.HOURS.between(repost.getCreatedAt(), LocalDateTime.now()));
        score += Math.max(0, 48 - hoursOld);
        if (currentUserId != null && repost.getUser() != null && currentUserId.equals(repost.getUser().getId())) {
            score += SELF_REPOST_BOOST;
        }
        return score;
    }

    private VideoFeedItem convertToFeedItem(FeedCandidate candidate, UUID currentUserId, FeedContext context) {
        Video video = candidate.getVideo();
        VideoFeedItem item = new VideoFeedItem();
        item.setId(video.getId());
        item.setFeedEntryId(candidate.isRepost() ? "repost:" + candidate.getRepost().getId() : "video:" + video.getId());
        item.setEntryType(candidate.isRepost() ? "repost" : "original");
        item.setTitle(video.getTitle());
        item.setDescription(video.getDescription());
        item.setVideoUrl("/api/videos/stream/" + video.getId());
        item.setThumbnailUrl(video.getThumbnailUrl());
        item.setDurationSeconds(video.getDurationSeconds());
        item.setCreatedAt(video.getCreatedAt().toString());
        item.setActivityAt(candidate.getActivityAt() != null ? candidate.getActivityAt().toString() : video.getCreatedAt().toString());
        item.setScore(candidate.getRankingScore());

        // User summary
        VideoFeedItem.UserSummary userSummary = new VideoFeedItem.UserSummary();
        userSummary.setId(video.getUser().getId());
        userSummary.setUsername(video.getUser().getUsername());
        userSummary.setAvatarUrl(video.getUser().getAvatarUrl());
        if (currentUserId != null) {
            userSummary.setFollowedByCurrentUser(context.followedUserIds.contains(video.getUser().getId()));
        }
        item.setUser(userSummary);

        if (candidate.isRepost()) {
            VideoFeedItem.UserSummary repostedBy = new VideoFeedItem.UserSummary();
            repostedBy.setId(candidate.getRepost().getUser().getId());
            repostedBy.setUsername(candidate.getRepost().getUser().getUsername());
            repostedBy.setAvatarUrl(candidate.getRepost().getUser().getAvatarUrl());
            item.setRepostedBy(repostedBy);
            item.setRepostedAt(candidate.getRepost().getCreatedAt() != null
                    ? candidate.getRepost().getCreatedAt().toString()
                    : null);
        }

        VideoStats stats = context.statsByVideoId.getOrDefault(video.getId(), createDefaultStats(video.getId()));
        VideoFeedItem.VideoStatsDto statsDto = new VideoFeedItem.VideoStatsDto();
        statsDto.setViewCount(stats.getViewCount() != null ? stats.getViewCount() : 0);
        statsDto.setLikeCount(stats.getLikeCount() != null ? stats.getLikeCount() : 0);
        statsDto.setCommentCount(stats.getCommentCount() != null ? stats.getCommentCount() : 0);
        statsDto.setShareCount(stats.getShareCount() != null ? stats.getShareCount() : 0);
        statsDto.setRepostCount(context.repostCountByVideoId.getOrDefault(video.getId(), 0L));
        item.setStats(statsDto);

        item.setHashtags(context.hashtagsByVideoId.getOrDefault(video.getId(), Collections.emptyList()));

        if (currentUserId != null) {
            item.setLikedByCurrentUser(context.likedVideoIds.contains(video.getId()));
            item.setCurrentUserHasReposted(context.currentUserRepostedVideoIds.contains(video.getId()));
        }

        return item;
    }

    private static class FeedContext {
        private final Map<UUID, VideoStats> statsByVideoId;
        private final Map<UUID, List<String>> hashtagsByVideoId;
        private final Set<UUID> likedVideoIds;
        private final Set<UUID> followedUserIds;
        private final Set<UUID> currentUserRepostedVideoIds;
        private final Map<UUID, Long> repostCountByVideoId;

        private FeedContext(Map<UUID, VideoStats> statsByVideoId,
                            Map<UUID, List<String>> hashtagsByVideoId,
                            Set<UUID> likedVideoIds,
                            Set<UUID> followedUserIds,
                            Set<UUID> currentUserRepostedVideoIds,
                            Map<UUID, Long> repostCountByVideoId) {
            this.statsByVideoId = statsByVideoId;
            this.hashtagsByVideoId = hashtagsByVideoId;
            this.likedVideoIds = likedVideoIds;
            this.followedUserIds = followedUserIds;
            this.currentUserRepostedVideoIds = currentUserRepostedVideoIds;
            this.repostCountByVideoId = repostCountByVideoId;
        }

        private static FeedContext empty() {
            return new FeedContext(
                    Collections.emptyMap(),
                    Collections.emptyMap(),
                    Collections.emptySet(),
                    Collections.emptySet(),
                    Collections.emptySet(),
                    Collections.emptyMap()
            );
        }
    }

    private static class FeedCandidate {
        private final Video video;
        private final VideoRepost repost;
        private final double rankingScore;
        private final LocalDateTime activityAt;

        private FeedCandidate(Video video, VideoRepost repost, double rankingScore, LocalDateTime activityAt) {
            this.video = video;
            this.repost = repost;
            this.rankingScore = rankingScore;
            this.activityAt = activityAt;
        }

        private static FeedCandidate original(Video video, double rankingScore) {
            return new FeedCandidate(video, null, rankingScore, video.getCreatedAt());
        }

        private static FeedCandidate repost(Video video, VideoRepost repost, double rankingScore) {
            return new FeedCandidate(video, repost, rankingScore, repost.getCreatedAt());
        }

        private Video getVideo() {
            return video;
        }

        private VideoRepost getRepost() {
            return repost;
        }

        private double getRankingScore() {
            return rankingScore;
        }

        private LocalDateTime getActivityAt() {
            return activityAt;
        }

        private boolean isRepost() {
            return repost != null;
        }
    }
}
