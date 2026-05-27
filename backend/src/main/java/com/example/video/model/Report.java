package com.example.video.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Entity ánh xạ bảng {@code reports} — báo cáo vi phạm của người dùng đối với video.
 *
 * <p>Khi người dùng bấm "Báo cáo" trên một video, một bản ghi được tạo với
 * {@code status='open'}. Báo cáo này có thể:</p>
 * <ul>
 *   <li>Tự động nâng mức ưu tiên hàng chờ kiểm duyệt liên quan lên {@code high}.</li>
 *   <li>Được moderator xem khi mở chi tiết video.</li>
 *   <li>Tự động chuyển sang {@code resolved} khi video bị reject (xem
 *       {@link com.example.video.service.ModerationService#rejectVideo}).</li>
 * </ul>
 */
@Entity
@Table(name = "reports")
@Data
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Report {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    /** Người dùng đã báo cáo (không lộ email/password ra JSON). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reporter_id", nullable = false)
    @JsonIgnoreProperties({"password", "email"})
    private User reporter;

    /** Video bị báo cáo. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "video_id", nullable = false)
    private Video video;

    /** Lý do báo cáo do người dùng nhập (free text). */
    @Column(nullable = false)
    private String reason;

    /** Trạng thái: {@code open} (mặc định) hoặc {@code resolved}. */
    @Column(name = "status")
    private String status = "open";

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
