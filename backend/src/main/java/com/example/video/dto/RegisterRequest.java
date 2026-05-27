package com.example.video.dto;

import lombok.Data;

/**
 * Request body cho endpoint đăng ký {@code POST /api/auth/register}.
 * Validation (unique username/email) được thực hiện ở tầng service.
 */
@Data
public class RegisterRequest {
    private String username;
    private String email;
    private String password;
}
