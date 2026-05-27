package com.example.video.dto;

import lombok.Data;

import java.util.UUID;

/**
 * Response tóm tắt cho một user dạng card — dùng trong kết quả tìm kiếm và gợi ý creator.
 * Chứa đủ thông tin để render card mà không cần thêm request.
 */
@Data
public class UserCardResponse {
    private UUID id;
    private String username;
    private String avatarUrl;
    private String bio;
    private long followerCount;
    private long videoCount;
    /** {@code true} nếu user đang đăng nhập đang follow creator này. */
    private boolean followedByCurrentUser;
}
