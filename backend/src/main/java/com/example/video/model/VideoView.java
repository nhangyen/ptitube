package com.example.video.model;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Entity ghi lại mỗi lượt xem video với thông tin chi tiết phục vụ recommendation engine.
 *
 * <p>Mỗi bản ghi chứa: thời gian xem thực tế ({@code watchDuration} giây),
 * trạng thái xem hết ({@code isCompleted}) và thời điểm xem ({@code viewedAt}).
 * Dữ liệu này được xuất sang CSV qua {@code InteractionLoggerService} để training mô hình AI.
 *
 * <p>{@code viewedAt} được tự động set khi persist nếu chưa được cung cấp.
 */
@Entity
@Table(name = "video_views")
@Data
public class VideoView {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "video_id", nullable = false)
    private UUID videoId;

    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "watch_duration", nullable = false)
    private Integer watchDuration;

    @Column(name = "is_completed")
    private Boolean isCompleted = false;

    @Column(name = "viewed_at")
    private LocalDateTime viewedAt;

    @PrePersist
    protected void onCreate() {
        if (viewedAt == null) {
            viewedAt = LocalDateTime.now();
        }
    }
}
