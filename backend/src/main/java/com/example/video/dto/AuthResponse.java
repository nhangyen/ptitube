package com.example.video.dto;

import lombok.Data;

/**
 * Response trả về sau khi đăng ký hoặc đăng nhập thành công.
 * Chứa JWT token và thông tin cơ bản của user để client lưu vào local storage.
 */
@Data
public class AuthResponse {
    private String id;
    private String token;
    private String username;
    private String email;
    private String avatarUrl;
    private String role;

    public AuthResponse(String id, String token, String username, String email, String avatarUrl, String role) {
        this.id = id;
        this.token = token;
        this.username = username;
        this.email = email;
        this.avatarUrl = avatarUrl;
        this.role = role;
    }
}
