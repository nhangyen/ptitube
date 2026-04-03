package com.example.video.dto;

import lombok.Data;

import java.util.UUID;

@Data
public class NotificationResponse {
    private UUID id;
    private String type;
    private String message;
    private boolean read;
    private String createdAt;
    private ActorSummary actor;
    private UUID videoId;
    private String videoTitle;
    private String videoThumbnailUrl;
    private UUID commentId;

    @Data
    public static class ActorSummary {
        private UUID id;
        private String username;
        private String avatarUrl;
    }
}
