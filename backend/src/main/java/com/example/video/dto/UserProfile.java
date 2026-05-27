package com.example.video.dto;

import lombok.Data;
import java.util.UUID;

/**
 * Response đầy đủ cho trang hồ sơ cá nhân (profile page) của một user.
 * Bao gồm thống kê (followers, following, video, likes) và trạng thái quan hệ với user đang đăng nhập.
 */
@Data
public class UserProfile {
    private UUID id;
    private String username;
    private String email;
    private String avatarUrl;
    private String bio;
    /** {@code true} nếu user đã được xác minh (tick xanh). */
    private boolean verified;
    /** {@code true} nếu đây là hồ sơ của chính user đang đăng nhập — ẩn nút follow, hiện nút edit. */
    private boolean currentUser;
    private String joinedAt;
    private long followerCount;
    private long followingCount;
    private long videoCount;
    /** Tổng số like nhận được trên tất cả video của user. */
    private long totalLikes;
    /** {@code true} nếu user đang đăng nhập đang follow user này. */
    private boolean isFollowedByCurrentUser;
}
