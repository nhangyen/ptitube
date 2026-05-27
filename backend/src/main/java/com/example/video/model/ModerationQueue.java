package com.example.video.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Entity ánh xạ bảng {@code moderation_queue} — hàng chờ kiểm duyệt video.
 *
 * <p>Mỗi bản ghi đại diện cho một video chờ moderator xem xét. Bản ghi được tạo
 * tự động sau khi {@link AiAnalysisJob} hoàn tất phân tích AI (kể cả khi AI fail).</p>
 *
 * <p><b>Vòng đời trạng thái:</b></p>
 * <ul>
 *   <li>{@code pending} – chưa có moderator nhận, hiển thị trên tab "Pending".</li>
 *   <li>{@code in_review} – đã có moderator nhận xử lý (assigned_to khác null).</li>
 *   <li>{@code reviewed} – đã có phán quyết approve hoặc reject.</li>
 * </ul>
 *
 * <p><b>Mức ưu tiên:</b> {@code normal} (mặc định) hoặc {@code high} (khi có user report).</p>
 */
@Entity
@Table(name = "moderation_queue")
@Data
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class ModerationQueue {
    /** Khóa chính UUID, sinh tự động bởi PostgreSQL ({@code uuid_generate_v4()}). */
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    /** Video cần kiểm duyệt — quan hệ N-1 với bảng {@code videos}. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "video_id", nullable = false)
    private Video video;

    /** AI job đã phân tích video này — null nếu không có AI job (hiếm). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ai_job_id")
    private AiAnalysisJob aiJob;

    /** Mức ưu tiên: {@code normal} hoặc {@code high}. */
    @Column(length = 10)
    private String priority = "normal";

    /** Trạng thái: {@code pending}, {@code in_review}, {@code reviewed}. */
    @Column(nullable = false, length = 20)
    private String status = "pending";

    /** Moderator được gán xử lý — null khi chưa có ai nhận. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_to")
    private User assignedTo;

    /**
     * JSON các cảnh báo tự động (auto flags) phát hiện bởi rule engine.
     * Lưu dưới dạng JSONB của PostgreSQL.
     */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "auto_flags", columnDefinition = "jsonb")
    private String autoFlags;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
