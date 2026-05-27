package com.example.video.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Entity đại diện cho người dùng trong hệ thống.
 *
 * <p>Password được serialize bỏ qua ({@code @JsonIgnoreProperties}) để tránh lộ hash
 * trong JSON response. Trường {@code numericId} (số nguyên tăng dần) được dùng bởi
 * recommendation engine thay vì UUID để tối ưu ma trận tính toán.
 *
 * <p>Vòng đời role: {@code user} (mặc định) → {@code moderator} hoặc {@code admin}
 * (cập nhật thủ công qua SQL).
 */
@Entity
@Table(name = "users")
@Data
@JsonIgnoreProperties({ "hibernateLazyInitializer", "handler", "password" })
public class User {
    /** UUID v4 — primary key, tự động sinh bởi PostgreSQL. */
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    /** ID số nguyên tăng dần, dùng cho recommendation engine (ma trận user-item). */
    @Column(name = "numeric_id")
    private Integer numericId;

    /** Username duy nhất, dùng làm subject của JWT. */
    @Column(unique = true, nullable = false)
    private String username;

    /** Email duy nhất, chỉ hiển thị cho chủ tài khoản. */
    @Column(unique = true, nullable = false)
    private String email;

    /** BCrypt hash của password. Không bao giờ serialize ra JSON. */
    @Column(name = "password_hash", nullable = false)
    private String password;

    /** URL avatar của người dùng (lưu trực tiếp URL, không upload qua MinIO). */
    @Column(name = "avatar_url")
    private String avatarUrl;

    /** Giới thiệu bản thân, hiển thị trên trang profile. */
    private String bio;

    /**
     * Vai trò của người dùng: {@code user} (mặc định), {@code moderator}, {@code admin}.
     * Quyết định quyền truy cập vào các endpoint kiểm duyệt.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "role")
    private com.example.video.model.UserRole role = com.example.video.model.UserRole.user;

    /** Tài khoản có tick xanh verified hay không. */
    @Column(name = "is_verified")
    private boolean isVerified = false;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
