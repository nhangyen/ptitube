package com.example.video.dto;

import lombok.Data;
import java.util.UUID;

@Data
public class UserProfile {
    private UUID id;
    private String username;
    private String email;
    private String avatarUrl;
    private String bio;
    private boolean verified;
    private boolean currentUser;
    private String joinedAt;
    private long followerCount;
    private long followingCount;
    private long videoCount;
    private long totalLikes;
    private boolean isFollowedByCurrentUser;
}
