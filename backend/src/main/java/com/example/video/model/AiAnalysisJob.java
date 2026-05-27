package com.example.video.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Entity ánh xạ bảng {@code ai_analysis_jobs} — theo dõi tiến trình phân tích AI
 * của từng video.
 *
 * <p>Mỗi lần {@link com.example.video.service.AiAnalysisService#analyzeVideo} chạy
 * sẽ tạo một bản ghi job. Cho phép một video có nhiều job (ví dụ chạy lại sau khi fail).</p>
 *
 * <p><b>Vòng đời trạng thái:</b></p>
 * <ul>
 *   <li>{@code queued} – chờ xử lý (chưa bao giờ được set ở luồng hiện tại, dành cho hàng đợi tương lai).</li>
 *   <li>{@code processing} – đang gọi Google Video Intelligence API.</li>
 *   <li>{@code completed} – phân tích thành công, có dữ liệu trong {@code video_scenes}.</li>
 *   <li>{@code failed} – có lỗi, xem {@link #errorMessage}.</li>
 * </ul>
 */
@Entity
@Table(name = "ai_analysis_jobs")
@Data
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class AiAnalysisJob {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    /** Video được phân tích. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "video_id", nullable = false)
    private Video video;

    /** Tên model AI dùng: {@code google-video-intelligence} hoặc {@code mock}. */
    @Column(name = "model_name", nullable = false, length = 100)
    private String modelName;

    /** Phiên bản model (vd: {@code v1}). */
    @Column(name = "model_version", length = 50)
    private String modelVersion;

    /** Trạng thái: {@code queued} / {@code processing} / {@code completed} / {@code failed}. */
    @Column(nullable = false, length = 20)
    private String status = "queued";

    /** Số cảnh phát hiện được sau phân tích. */
    @Column(name = "scenes_detected")
    private Integer scenesDetected;

    /** Tóm tắt kết quả phân tích (JSON), dùng cho debug và analytics. */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "result_summary", columnDefinition = "jsonb")
    private String resultSummary;

    /** Thông báo lỗi khi {@code status='failed'}. */
    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    /** Thời điểm bắt đầu gọi API. */
    @Column(name = "started_at")
    private LocalDateTime startedAt;

    /** Thời điểm kết thúc (thành công hoặc fail). */
    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
