package com.example.video.model;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Entity đại diện cho tag/hashtag dùng để phân loại và tìm kiếm video.
 *
 * <p>Hiện hỗ trợ category {@code "hashtag"} (trích xuất từ tiêu đề/mô tả video).
 * Tên tag được lưu chữ thường (lowercase) và unique để tránh trùng lặp.
 * Tag có thể bị deactivate ({@code isActive=false}) thay vì xóa để giữ toàn vẹn dữ liệu lịch sử.
 */
@Entity
@Table(name = "tags")
@Data
public class Tag {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(unique = true, nullable = false, length = 100)
    private String name;

    @Column(length = 50)
    private String category;

    @Column(name = "is_active")
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
