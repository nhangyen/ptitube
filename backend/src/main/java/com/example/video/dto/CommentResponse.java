package com.example.video.dto;

import lombok.Data;
import java.util.UUID;
import java.util.List;

@Data
public class CommentResponse {
    private UUID id;
    private String content;
    private UserSummary user;
    private String createdAt;
    private List<CommentResponse> replies;

    @Data
    public static class UserSummary {
        private UUID id;
        private String username;
        private String avatarUrl;
    }
}
