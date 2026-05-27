package com.example.video.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Entity ánh xạ bảng {@code video_scenes} — danh sách cảnh phát hiện được trong video.
 *
 * <p>Mỗi cảnh là một đoạn liên tục (start_time → end_time) trong video, do
 * Google Video Intelligence phát hiện qua tính năng Shot Change Detection.
 * Một cảnh có thể có nhiều tag ({@link SceneTag}).</p>
 *
 * <p><b>Trạng thái cảnh:</b></p>
 * <ul>
 *   <li>{@code auto_tagged} – AI đã gán tag tự động, chưa có moderator review.</li>
 *   <li>{@code revised} – moderator đã chỉnh sửa (thêm/xoá tag thủ công).</li>
 * </ul>
 */
@Entity
@Table(name = "video_scenes")
@Data
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class VideoScene {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    /** Video chứa cảnh này. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "video_id", nullable = false)
    private Video video;

    /** Số thứ tự cảnh trong video (0-based). */
    @Column(name = "scene_index", nullable = false)
    private Integer sceneIndex;

    /** Thời điểm cảnh bắt đầu (giây, có phần thập phân). */
    @Column(name = "start_time", nullable = false)
    private Double startTime;

    /** Thời điểm cảnh kết thúc (giây, có phần thập phân). */
    @Column(name = "end_time", nullable = false)
    private Double endTime;

    /** URL thumbnail đại diện cho cảnh (chưa hiện thực ở phiên bản hiện tại). */
    @Column(name = "thumbnail_url")
    private String thumbnailUrl;

    /** Mô tả tóm tắt do AI sinh ra (chưa hiện thực với Google API hiện tại). */
    @Column(name = "ai_summary", columnDefinition = "TEXT")
    private String aiSummary;

    /** Trạng thái cảnh: {@code auto_tagged} hoặc {@code revised}. */
    @Column(length = 20)
    private String status = "auto_tagged";

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
