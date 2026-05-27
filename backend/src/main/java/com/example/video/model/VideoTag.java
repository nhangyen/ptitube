package com.example.video.model;

import jakarta.persistence.*;
import lombok.Data;

import java.util.UUID;

/**
 * Entity đại diện cho quan hệ nhiều-nhiều giữa Video và Tag.
 *
 * <p>Khóa chính composite: {@code (videoId, tagId)}, dùng {@link VideoTagId}.
 * Trường {@code source} ghi rõ nguồn gốc tag:
 * <ul>
 *   <li>{@code "uploader"} — Trích xuất từ tiêu đề/mô tả do người upload.</li>
 *   <li>{@code "ai"} — Tag được gán bởi Google Video Intelligence API.</li>
 *   <li>{@code "admin"} — Tag được gán thủ công bởi moderator/admin.</li>
 * </ul>
 * Trường {@code weight} dùng cho recommendation engine (mặc định 1.0).
 */
@Entity
@Table(name = "video_tags")
@Data
@IdClass(VideoTagId.class)
public class VideoTag {
    @Id
    @Column(name = "video_id")
    private UUID videoId;

    @Id
    @Column(name = "tag_id")
    private UUID tagId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "video_id", insertable = false, updatable = false)
    private Video video;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tag_id", insertable = false, updatable = false)
    private Tag tag;

    @Column(nullable = false, length = 20)
    private String source;

    private Double weight = 1.0;

    @Column(name = "assigned_by")
    private UUID assignedBy;
}
