package com.example.video.model;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Entity đại diện cho lượt like video.
 *
 * <p>Khóa chính composite: {@code (userId, videoId)} — mỗi user chỉ like một video một lần.
 * Sử dụng {@link LikeId} làm IdClass. Quan hệ ManyToOne với User và Video được khai báo
 * {@code insertable=false, updatable=false} để tránh xung đột với các cột khóa chính.
 */
@Entity
@Table(name = "likes")
@Data
@IdClass(LikeId.class)
public class Like {
    @Id
    @Column(name = "user_id")
    private UUID userId;

    @Id
    @Column(name = "video_id")
    private UUID videoId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", insertable = false, updatable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "video_id", insertable = false, updatable = false)
    private Video video;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
