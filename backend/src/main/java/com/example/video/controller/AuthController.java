package com.example.video.controller;

import com.example.video.dto.AuthResponse;
import com.example.video.dto.LoginRequest;
import com.example.video.dto.RegisterRequest;
import com.example.video.service.AuthService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Controller xử lý đăng ký và đăng nhập tài khoản người dùng.
 *
 * <p>Hai endpoint công khai (không cần JWT):
 * <ul>
 *   <li>{@code POST /api/auth/register} — Tạo tài khoản mới và tự động đăng nhập (trả về JWT).</li>
 *   <li>{@code POST /api/auth/login} — Xác thực thông tin đăng nhập và trả về JWT.</li>
 * </ul>
 *
 * <p>JWT trả về cần được lưu phía client (AsyncStorage hoặc SecureStore) và đính kèm
 * vào header {@code Authorization: Bearer <token>} cho mọi request sau đó.
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private AuthService authService;

    /**
     * Đăng ký tài khoản mới.
     *
     * <p>Kiểm tra trùng username và email trước khi tạo. Sau khi tạo thành công,
     * tự động thực hiện đăng nhập và trả về JWT.
     *
     * @param request thông tin đăng ký (username, email, password)
     * @return AuthResponse chứa JWT và thông tin cơ bản của tài khoản vừa tạo
     */
    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@RequestBody RegisterRequest request) {
        return ResponseEntity.ok(authService.register(request));
    }

    /**
     * Đăng nhập bằng username và password.
     *
     * @param request thông tin đăng nhập (username, password)
     * @return AuthResponse chứa JWT, userId, username, email, avatarUrl và role
     */
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody LoginRequest request) {
        System.out.println("DEBUG: Login attempt for user: " + request.getUsername());
        return ResponseEntity.ok(authService.authenticate(request));
    }
}
