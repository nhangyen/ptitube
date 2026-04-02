package com.example.video.service;

import com.example.video.dto.*;
import com.example.video.model.Tag;
import com.example.video.model.User;
import com.example.video.model.Video;
import com.example.video.model.VideoStatus;
import com.example.video.repository.FollowRepository;
import com.example.video.repository.TagRepository;
import com.example.video.repository.UserRepository;
import com.example.video.repository.VideoRepository;
import com.example.video.repository.VideoTagRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class DiscoverService {

    @Autowired
    private RecommendationService recommendationService;

    @Autowired
    private TagService tagService;

    @Autowired
    private VideoRepository videoRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TagRepository tagRepository;

    @Autowired
    private FollowRepository followRepository;

    @Autowired
    private VideoTagRepository videoTagRepository;

    public DiscoverResponse getDiscover(UUID currentUserId) {
        DiscoverResponse response = new DiscoverResponse();
        response.setFeaturedVideos(recommendationService.getRecommendedFeed(currentUserId, 0, 8));
        response.setTrendingHashtags(tagService.getTrendingHashtags(8));
        List<User> users = userRepository.findAll().stream()
                .filter(user -> currentUserId == null || !user.getId().equals(currentUserId))
                .collect(Collectors.toList());
        Map<UUID, Long> followerCounts = getFollowerCounts(users);
        Map<UUID, Long> activeVideoCounts = getActiveVideoCounts(users);

        response.setSuggestedCreators(users.stream()
                .sorted((left, right) -> Long.compare(
                        scoreUser(right, followerCounts, activeVideoCounts),
                        scoreUser(left, followerCounts, activeVideoCounts)))
                .limit(8)
                .map(user -> toUserCard(user, currentUserId, followerCounts, activeVideoCounts))
                .collect(Collectors.toList()));
        return response;
    }

    public SearchResponse search(String rawQuery, UUID currentUserId, int page, int size) {
        String query = tagService.normalizeHashtag(rawQuery);

        SearchResponse response = new SearchResponse();
        response.setQuery(rawQuery);
        if (query.isBlank()) {
            response.setVideos(Collections.emptyList());
            response.setUsers(Collections.emptyList());
            response.setHashtags(Collections.emptyList());
            return response;
        }

        int offset = Math.max(page, 0) * Math.max(size, 1);
        List<Video> videoMatches = new ArrayList<>();
        try {
            videoMatches.addAll(videoRepository.searchActiveVideos(query, size, offset));
        } catch (Exception ignored) {
            // Fallback below when full-text search is unavailable.
        }
        if (videoMatches.isEmpty()) {
            videoMatches = videoRepository.searchActiveVideosFallback(query, VideoStatus.active).stream()
                    .skip(offset)
                    .limit(size)
                    .collect(Collectors.toList());
        }

        response.setVideos(recommendationService.toFeedItems(videoMatches, currentUserId));
        List<User> matchedUsers = userRepository.findTop10ByUsernameContainingIgnoreCaseOrderByUsernameAsc(query);
        Map<UUID, Long> followerCounts = getFollowerCounts(matchedUsers);
        Map<UUID, Long> activeVideoCounts = getActiveVideoCounts(matchedUsers);
        response.setUsers(matchedUsers.stream()
                .map(user -> toUserCard(user, currentUserId, followerCounts, activeVideoCounts))
                .collect(Collectors.toList()));
        response.setHashtags(tagService.searchHashtags(query));
        return response;
    }

    public HashtagDetailResponse getHashtagDetail(String rawTagName, UUID currentUserId, int page, int size) {
        String tagName = tagService.normalizeHashtag(rawTagName);
        Tag tag = tagRepository.findByNameIgnoreCase(tagName)
                .filter(value -> "hashtag".equalsIgnoreCase(value.getCategory()))
                .orElseThrow(() -> new RuntimeException("Hashtag not found"));

        int safePage = Math.max(page, 0);
        int safeSize = Math.max(size, 1);
        List<UUID> matchingVideoIds = videoTagRepository.findActiveVideoIdsByTagId(
                tag.getId(),
                VideoStatus.active.name(),
                safeSize,
                safePage * safeSize
        );
        Map<UUID, Integer> positionById = new HashMap<>();
        for (int index = 0; index < matchingVideoIds.size(); index++) {
            positionById.put(matchingVideoIds.get(index), index);
        }

        List<Video> matchingVideos = videoRepository.findAllWithUserByIdIn(matchingVideoIds).stream()
                .sorted(Comparator.comparingInt(video -> positionById.getOrDefault(video.getId(), Integer.MAX_VALUE)))
                .collect(Collectors.toList());

        HashtagDetailResponse response = new HashtagDetailResponse();
        HashtagResponse hashtagResponse = new HashtagResponse();
        hashtagResponse.setName(tag.getName());
        hashtagResponse.setDisplayName("#" + tag.getName());
        hashtagResponse.setVideoCount(videoTagRepository.countDistinctActiveVideoIdsByTagId(tag.getId(), VideoStatus.active.name()));
        response.setHashtag(hashtagResponse);
        response.setVideos(recommendationService.toFeedItems(matchingVideos, currentUserId));
        return response;
    }

    public VideoFeedItem getVideoDetail(UUID videoId, UUID currentUserId) {
        Video video = videoRepository.findById(videoId)
                .orElseThrow(() -> new RuntimeException("Video not found"));
        return recommendationService.toFeedItem(video, currentUserId);
    }

    private Map<UUID, Long> getFollowerCounts(List<User> users) {
        if (users.isEmpty()) {
            return Collections.emptyMap();
        }
        List<UUID> userIds = users.stream().map(User::getId).collect(Collectors.toList());
        return followRepository.countFollowersByFollowingIds(userIds).stream()
                .collect(Collectors.toMap(
                        row -> (UUID) row[0],
                        row -> ((Number) row[1]).longValue()
                ));
    }

    private Map<UUID, Long> getActiveVideoCounts(List<User> users) {
        if (users.isEmpty()) {
            return Collections.emptyMap();
        }
        List<UUID> userIds = users.stream().map(User::getId).collect(Collectors.toList());
        return videoRepository.countByUserIdsAndStatus(userIds, VideoStatus.active).stream()
                .collect(Collectors.toMap(
                        row -> (UUID) row[0],
                        row -> ((Number) row[1]).longValue()
                ));
    }

    private long scoreUser(User user, Map<UUID, Long> followerCounts, Map<UUID, Long> activeVideoCounts) {
        long followerCount = followerCounts.getOrDefault(user.getId(), 0L);
        long videoCount = activeVideoCounts.getOrDefault(user.getId(), 0L);
        return followerCount * 3 + videoCount;
    }

    private UserCardResponse toUserCard(User user,
                                        UUID currentUserId,
                                        Map<UUID, Long> followerCounts,
                                        Map<UUID, Long> activeVideoCounts) {
        UserCardResponse response = new UserCardResponse();
        response.setId(user.getId());
        response.setUsername(user.getUsername());
        response.setAvatarUrl(user.getAvatarUrl());
        response.setBio(user.getBio());
        response.setFollowerCount(followerCounts.getOrDefault(user.getId(), 0L));
        response.setVideoCount(activeVideoCounts.getOrDefault(user.getId(), 0L));
        response.setFollowedByCurrentUser(currentUserId != null
                && followRepository.existsByFollowerIdAndFollowingId(currentUserId, user.getId()));
        return response;
    }
}
