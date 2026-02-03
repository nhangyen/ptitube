package com.example.video.controller;

import com.example.video.dto.AuthResponse;
import com.example.video.dto.LoginRequest;
import com.example.video.dto.RegisterRequest;
import com.example.video.service.AuthService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@RequestBody RegisterRequest request) {
        return ResponseEntity.ok(authService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody LoginRequest request) {
        System.out.println("DEBUG: Login attempt for user: " + request.getUsername());
        return ResponseEntity.ok(authService.authenticate(request));
    }
}
