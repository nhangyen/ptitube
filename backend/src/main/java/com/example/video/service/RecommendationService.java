package com.example.video.service;

import com.example.video.dto.AiPredictionRequest;
import com.example.video.dto.AiPredictionResponse;
import com.example.video.dto.VideoFeedItem;
import com.example.video.model.*;
import com.example.video.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * Recommendation Engine with AI integration.
 *
 * Path A (New User): account < 1 day OR watched < 20 videos → Random unwatched videos
 * Path B (Existing User): 60 candidates → AI /predict → sort by predicted_watch_time → select + shuffle
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

    @Autowired
    private VideoViewRepository videoViewRepository;

    @Autowired
    private UserRepository userRepository;

    @Value("${ai.server.url:http://192.168.1.23:8000}")
    private String aiServerUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    private static final int CANDIDATE_POOL_SIZE = 60;
    private static final int MIN_FOLLOWED_VIDEOS = 2;
    private static final long NEW_USER_VIEW_THRESHOLD = 20;
    private static final long NEW_USER_DAYS_THRESHOLD = 1;

    // ==================== PUBLIC API ====================

    /**
     * Main feed endpoint: routes to random (new user) or AI-powered (existing user).
     */
    public List<VideoFeedItem> getRecommendedFeed(UUID currentUserId, int page, int size) {
        int safeSize = Math.max(size, 1);

        // Anonymous user or null → random
        if (currentUserId == null) {
            return getRandomFeed(null, safeSize);
        }

        User user = userRepository.findById(currentUserId).orElse(null);
        if (user == null) {
            return getRandomFeed(null, safeSize);
        }

        // Check if new user
        if (isNewUser(user)) {
            return getRandomFeed(currentUserId, safeSize);
        }

        // Existing user → AI-powered feed
        return getAiPoweredFeed(user, safeSize);
    }

    // ==================== PATH A: NEW USER / RANDOM ====================

    private boolean isNewUser(User user) {
        // Condition 1: Account created less than 1 day ago
        if (user.getCreatedAt() != null) {
            long daysSinceCreation = ChronoUnit.DAYS.between(user.getCreatedAt(), LocalDateTime.now());
            if (daysSinceCreation < NEW_USER_DAYS_THRESHOLD) {
                return true;
            }
        }

        // Condition 2: Watched fewer than 20 videos
        long videosWatched = videoViewRepository.countDistinctVideosWatched(user.getId());
        return videosWatched < NEW_USER_VIEW_THRESHOLD;
    }

    private List<VideoFeedItem> getRandomFeed(UUID currentUserId, int size) {
        List<UUID> videoIds;
        if (currentUserId != null) {
            videoIds = videoRepository.findRandomUnwatchedVideoIds(currentUserId, size);
            // Fallback if not enough unwatched
            if (videoIds.size() < size) {
                videoIds = videoRepository.findRandomActiveVideoIds(size);
            }
        } else {
            videoIds = videoRepository.findRandomActiveVideoIds(size);
        }

        if (videoIds.isEmpty()) {
            return Collections.emptyList();
        }

        List<Video> videos = videoRepository.findAllWithUserByIdIn(videoIds);
        // Shuffle to randomize
        Collections.shuffle(videos);

        FeedContext context = buildFeedContext(videos, currentUserId);
        return videos.stream()
                .map(video -> convertToFeedItem(video, 0, currentUserId, context))
                .collect(Collectors.toList());
    }

    // ==================== PATH B: AI-POWERED FEED ====================

    private List<VideoFeedItem> getAiPoweredFeed(User user, int size) {
        UUID userId = user.getId();

        // Step 1: Get at least MIN_FOLLOWED_VIDEOS from followed users
        List<UUID> followedVideoIds = videoRepository.findRandomFollowedVideoIds(userId, MIN_FOLLOWED_VIDEOS);

        // Step 2: Fill remaining slots to reach CANDIDATE_POOL_SIZE
        int remainingSlots = CANDIDATE_POOL_SIZE - followedVideoIds.size();
        Set<UUID> excludeIds = new HashSet<>(followedVideoIds);
        if (excludeIds.isEmpty()) {
            // Avoid empty IN clause
            excludeIds.add(UUID.fromString("00000000-0000-0000-0000-000000000000"));
        }
        List<UUID> otherVideoIds = videoRepository.findRandomVideoIdsExcluding(excludeIds, remainingSlots);

        // Step 3: Load all candidate videos
        Set<UUID> allCandidateIds = new LinkedHashSet<>();
        allCandidateIds.addAll(followedVideoIds);
        allCandidateIds.addAll(otherVideoIds);

        List<Video> allCandidates = videoRepository.findAllWithUserByIdIn(allCandidateIds);
        if (allCandidates.isEmpty()) {
            return getRandomFeed(userId, size);
        }

        // Separate followed videos from others for later mixing
        Set<UUID> followedSet = new HashSet<>(followedVideoIds);
        List<Video> followedVideos = allCandidates.stream()
                .filter(v -> followedSet.contains(v.getId()))
                .collect(Collectors.toList());
        List<Video> candidatesForAi = allCandidates.stream()
                .filter(v -> !followedSet.contains(v.getId()))
                .collect(Collectors.toList());

        // Step 4: Build AI request and call predict
        List<Video> aiSortedVideos;
        try {
            AiPredictionRequest request = buildAiRequest(user, candidatesForAi);
            AiPredictionResponse response = callAiServer(request);
            aiSortedVideos = applySorting(candidatesForAi, response);
        } catch (Exception e) {
            System.err.println("AI prediction failed, falling back to random: " + e.getMessage());
            aiSortedVideos = candidatesForAi;
            Collections.shuffle(aiSortedVideos);
        }

        // Step 5: Select top (size - 1) + 1 near bottom + followed videos
        List<Video> selectedVideos = selectFinalVideos(aiSortedVideos, followedVideos, size);

        // Step 6: Shuffle the final list
        Collections.shuffle(selectedVideos);

        // Step 7: Convert to feed items
        FeedContext context = buildFeedContext(selectedVideos, userId);
        return selectedVideos.stream()
                .map(video -> convertToFeedItem(video, 0, userId, context))
                .collect(Collectors.toList());
    }

    // ==================== AI REQUEST/RESPONSE ====================

    private AiPredictionRequest buildAiRequest(User user, List<Video> candidates) {
        AiPredictionRequest request = new AiPredictionRequest();

        // Build user profile
        AiPredictionRequest.UserProfile profile = buildUserProfile(user);
        request.setUserProfile(profile);

        // Build video candidates
        List<AiPredictionRequest.VideoCandidate> videoCandidates = candidates.stream()
                .filter(v -> v.getNumericId() != null)
                .map(this::buildVideoCandidate)
                .collect(Collectors.toList());
        request.setVideoCandidates(videoCandidates);

        return request;
    }

    private AiPredictionRequest.UserProfile buildUserProfile(User user) {
        AiPredictionRequest.UserProfile profile = new AiPredictionRequest.UserProfile();

        // user_id: use numericId, or 0 if unknown to AI
        profile.setUserId(user.getNumericId() != null ? user.getNumericId() : 0);

        // active_degree: based on total views
        long totalViews = videoViewRepository.countByUserId(user.getId());
        if (totalViews < 10) profile.setActiveDegree(0);
        else if (totalViews < 50) profile.setActiveDegree(1);
        else if (totalViews < 200) profile.setActiveDegree(2);
        else profile.setActiveDegree(3);

        // is_live_streamer: not supported yet
        profile.setIsLiveStreamer(0);

        // is_video_author: has uploaded videos?
        long videoCount = videoRepository.countByUserIdAndStatus(user.getId(), VideoStatus.active);
        profile.setIsVideoAuthor(videoCount > 0 ? 1 : 0);

        // follow_user_num_range
        long followingCount = followRepository.countByFollowerId(user.getId());
        profile.setFollowUserNumRange(calculateRange(followingCount, new long[]{0, 10, 50, 100, 500}));

        // fans_user_num_range
        long followerCount = followRepository.countByFollowingId(user.getId());
        profile.setFansUserNumRange(calculateRange(followerCount, new long[]{0, 10, 50, 100, 500}));

        // register_days_range
        long daysSinceReg = user.getCreatedAt() != null
                ? ChronoUnit.DAYS.between(user.getCreatedAt(), LocalDateTime.now())
                : 0;
        profile.setRegisterDaysRange(calculateRange(daysSinceReg, new long[]{0, 7, 30, 90, 365}));

        return profile;
    }

    private AiPredictionRequest.VideoCandidate buildVideoCandidate(Video video) {
        AiPredictionRequest.VideoCandidate candidate = new AiPredictionRequest.VideoCandidate();

        candidate.setCandidateId(video.getNumericId());
        candidate.setItemId(0); // 0 for videos not yet trained by AI

        float duration = video.getDurationSeconds() != null ? video.getDurationSeconds() : 30.0f;
        candidate.setDurationSeconds(duration);

        // Category → feat0, rest default to 0
        int categoryId = video.getCategoryId() != null ? video.getCategoryId() : 0;
        VideoCategory category = VideoCategory.fromFeatValue(categoryId);
        candidate.setFeat0(category.getFeatValue());
        candidate.setFeat1(0);
        candidate.setFeat2(0);
        candidate.setFeat3(0);

        return candidate;
    }

    private AiPredictionResponse callAiServer(AiPredictionRequest request) {
        String url = aiServerUrl + "/predict";
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<AiPredictionRequest> entity = new HttpEntity<>(request, headers);

        return restTemplate.postForObject(url, entity, AiPredictionResponse.class);
    }

    private List<Video> applySorting(List<Video> candidates, AiPredictionResponse response) {
        if (response == null || response.getPredictions() == null || response.getPredictions().isEmpty()) {
            return candidates;
        }

        // Build a map: candidateId → predictedWatchTime
        Map<Integer, Float> predictionMap = response.getPredictions().stream()
                .collect(Collectors.toMap(
                        AiPredictionResponse.Prediction::getCandidateId,
                        AiPredictionResponse.Prediction::getPredictedWatchTime,
                        (a, b) -> a // keep first on duplicate
                ));

        // Sort candidates by predicted watch time DESC
        candidates.sort((a, b) -> {
            float scoreA = predictionMap.getOrDefault(a.getNumericId(), 0f);
            float scoreB = predictionMap.getOrDefault(b.getNumericId(), 0f);
            return Float.compare(scoreB, scoreA); // DESC
        });

        return candidates;
    }

    private List<Video> selectFinalVideos(List<Video> aiSorted, List<Video> followedVideos, int size) {
        List<Video> result = new ArrayList<>();

        // Add followed videos first (they always get included)
        result.addAll(followedVideos);

        int remainingSlots = size - result.size();

        if (!aiSorted.isEmpty() && remainingSlots > 0) {
            // Take top (remainingSlots - 1) from AI sorted (best predictions)
            int topCount = Math.min(remainingSlots - 1, aiSorted.size());
            if (topCount > 0) {
                result.addAll(aiSorted.subList(0, topCount));
            }

            // Take 1 video from near bottom (for content discovery/diversity)
            if (result.size() < size && aiSorted.size() > topCount) {
                int bottomIndex = Math.max(aiSorted.size() - 2, topCount); // near last
                result.add(aiSorted.get(bottomIndex));
            }
        }

        // If still not enough, add more from AI sorted
        while (result.size() < size && result.size() < aiSorted.size() + followedVideos.size()) {
            for (Video v : aiSorted) {
                if (!result.contains(v) && result.size() < size) {
                    result.add(v);
                }
            }
            break;
        }

        return result;
    }

    // ==================== HELPERS ====================

    private int calculateRange(long value, long[] thresholds) {
        for (int i = thresholds.length - 1; i >= 0; i--) {
            if (value >= thresholds[i]) return i;
        }
        return 0;
    }

    // ==================== SHARED CONVERSION LOGIC ====================

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
        item.setVideoUrl(video.getVideoUrl());
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

    private VideoStats createDefaultStats(UUID videoId) {
        VideoStats stats = new VideoStats();
        stats.setVideoId(videoId);
        stats.setViewCount(0L);
        stats.setLikeCount(0L);
        stats.setCommentCount(0L);
        stats.setShareCount(0L);
        return stats;
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
