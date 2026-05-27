package com.example.video.dto;

import lombok.Data;

/**
 * Request body cho endpoint đăng nhập {@code POST /api/auth/login}.
 */
@Data
public class LoginRequest {
    private String username;
    private String password;
}
