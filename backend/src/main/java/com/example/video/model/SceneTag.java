package com.example.video.model;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Entity ánh xạ bảng {@code scene_tags} — liên kết nhiều-nhiều giữa cảnh và tag,
 * kèm metadata về nguồn gốc và độ tin cậy.
 *
 * <p>Composite primary key gồm {@code (scene_id, tag_id)} — xem {@link SceneTagId}.</p>
 *
 * <p><b>Nguồn ({@code source}):</b></p>
 * <ul>
 *   <li>{@code ai} – do Google Video Intelligence gán; {@code confidence} là điểm trả về từ API (0-1).</li>
 *   <li>{@code admin} – do moderator gán thủ công; {@code confidence = 1.0} (luôn tin tưởng tuyệt đối).</li>
 * </ul>
 *
 * <p>Mobile UI dùng confidence để highlight các tag nguy cơ cao (≥ 0.8) bằng màu cảnh báo.</p>
 */
@Entity
@Table(name = "scene_tags")
@Data
@IdClass(SceneTagId.class)
public class SceneTag {
    /** Phần một của composite key — cảnh được gán tag. */
    @Id
    @Column(name = "scene_id")
    private UUID sceneId;

    /** Phần hai của composite key — tag được gán. */
    @Id
    @Column(name = "tag_id")
    private UUID tagId;

    /** Object navigation đến VideoScene (read-only, không insert/update). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "scene_id", insertable = false, updatable = false)
    private VideoScene scene;

    /** Object navigation đến Tag (read-only, không insert/update). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tag_id", insertable = false, updatable = false)
    private Tag tag;

    /** Nguồn gốc tag: {@code ai} hoặc {@code admin}. */
    @Column(nullable = false, length = 20)
    private String source;

    /** Điểm tin cậy [0.0, 1.0]. Với tag admin luôn là 1.0. */
    private Double confidence;

    /** UUID của moderator gán tag (chỉ áp dụng cho tag admin). */
    @Column(name = "assigned_by")
    private UUID assignedBy;

    @CreationTimestamp
    @Column(name = "assigned_at", updatable = false)
    private LocalDateTime assignedAt;
}
