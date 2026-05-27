package com.example.video.dto;

import lombok.Data;

/**
 * Request body cho endpoint cập nhật hồ sơ cá nhân {@code PUT /api/admin/profile}.
 * Tất cả field đều optional — chỉ field có giá trị non-null mới được áp dụng ở tầng service.
 */
@Data
public class UpdateProfileRequest {
    private String username;
    private String bio;
    private String avatarUrl;
}
