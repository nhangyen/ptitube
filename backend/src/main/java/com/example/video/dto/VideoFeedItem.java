package com.example.video.dto;

import lombok.Data;
import java.util.List;
import java.util.UUID;

@Data
public class VideoFeedItem {
    private UUID id;
    private String feedEntryId;
    private String entryType;
    private String title;
    private String description;
    private String videoUrl;
    private String thumbnailUrl;
    private Integer durationSeconds;
    private UserSummary user;
    private UserSummary repostedBy;
    private VideoStatsDto stats;
    private List<String> hashtags;
    private boolean likedByCurrentUser;
    private boolean currentUserHasReposted;
    private String createdAt;
    private String activityAt;
    private String repostedAt;
    private double score; // For recommendation ranking

    @Data
    public static class UserSummary {
        private UUID id;
        private String username;
        private String avatarUrl;
        private boolean followedByCurrentUser;
    }

    @Data
    public static class VideoStatsDto {
        private long viewCount;
        private long likeCount;
        private long commentCount;
        private long shareCount;
        private long repostCount;
    }
}
