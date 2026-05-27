package com.example.video.model;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Entity đại diện cho quan hệ follow giữa hai người dùng.
 *
 * <p>Khóa chính composite: {@code (followerId, followingId)} — mỗi cặp follow chỉ tồn tại một lần.
 * Sử dụng {@link FollowId} làm IdClass. Tham chiếu {@code follower} (người follow) và
 * {@code following} (người được follow) được khai báo read-only để tránh xung đột với khóa chính.
 */
@Entity
@Table(name = "follows")
@Data
@IdClass(FollowId.class)
public class Follow {
    @Id
    @Column(name = "follower_id")
    private UUID followerId;

    @Id
    @Column(name = "following_id")
    private UUID followingId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "follower_id", insertable = false, updatable = false)
    private User follower;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "following_id", insertable = false, updatable = false)
    private User following;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
