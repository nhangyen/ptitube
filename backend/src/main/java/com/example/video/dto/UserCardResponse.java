package com.example.video.dto;

import lombok.Data;

import java.util.UUID;

@Data
public class UserCardResponse {
    private UUID id;
    private String username;
    private String avatarUrl;
    private String bio;
    private long followerCount;
    private long videoCount;
    private boolean followedByCurrentUser;
}
