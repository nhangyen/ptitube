package com.example.video.model;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Entity đại diện cho thông báo trong hệ thống.
 *
 * <p>Thông báo được tạo tự động khi có các sự kiện xã hội:
 * like video, comment, follow, reply vào bình luận.
 *
 * <p>Mỗi thông báo liên kết:
 * <ul>
 *   <li>{@code actor} — Người thực hiện hành động.</li>
 *   <li>{@code recipient} — Người nhận thông báo.</li>
 *   <li>{@code video} (tùy chọn) — Video liên quan (nếu là like/comment).</li>
 *   <li>{@code comment} (tùy chọn) — Bình luận liên quan (nếu là comment/reply).</li>
 * </ul>
 */
@Entity
@Table(name = "notifications")
@Data
public class Notification {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recipient_id", nullable = false)
    private User recipient;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_id", nullable = false)
    private User actor;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "video_id")
    private Video video;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "comment_id")
    private Comment comment;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private NotificationType type;

    @Column(nullable = false, length = 255)
    private String message;

    @Column(name = "is_read", nullable = false)
    private boolean isRead = false;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
