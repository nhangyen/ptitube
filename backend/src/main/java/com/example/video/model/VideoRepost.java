package com.example.video.model;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Entity đại diện cho lượt repost video của người dùng lên feed cá nhân.
 *
 * <p>Unique constraint {@code (user_id, video_id)} đảm bảo mỗi người chỉ repost
 * một video một lần. Repost được hiển thị trên profile và feed của người repost,
 * kèm thông tin người repost để phân biệt với video gốc.
 */
@Entity
@Table(
        name = "video_reposts",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_video_reposts_user_video", columnNames = {"user_id", "video_id"})
        }
)
@Data
public class VideoRepost {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "video_id", nullable = false)
    private Video video;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
