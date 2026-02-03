package com.example.video.dto;

import lombok.Data;
import java.util.UUID;

@Data
public class UserProfile {
    private UUID id;
    private String username;
    private String avatarUrl;
    private String bio;
    private long followerCount;
    private long followingCount;
    private long videoCount;
    private long totalLikes;
    private boolean isFollowedByCurrentUser;
}
