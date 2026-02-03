package com.example.video.dto;

import lombok.Data;
import java.util.UUID;

@Data
public class VideoFeedItem {
    private UUID id;
    private String title;
    private String description;
    private String videoUrl;
    private String thumbnailUrl;
    private Integer durationSeconds;
    private UserSummary user;
    private VideoStatsDto stats;
    private boolean likedByCurrentUser;
    private String createdAt;
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
    }
}
