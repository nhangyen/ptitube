package com.example.video.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Entity đại diện cho video trong hệ thống.
 *
 * <p>Vòng đời trạng thái video:
 * <ul>
 *   <li>{@code pending} — Vừa upload, chưa phân tích AI.</li>
 *   <li>{@code active} — Đang hiển thị trên feed (sau khi AI phân tích xong).</li>
 *   <li>{@code banned} — Bị kiểm duyệt từ chối hoặc admin ẩn.</li>
 * </ul>
 *
 * <p>Trường {@code videoUrl} bị ẩn khỏi JSON ({@code @JsonIgnore}). Thay vào đó,
 * {@code getStreamUrl()} trả về URL stream dạng {@code /api/videos/stream/{id}} để client
 * không cần biết object name trong MinIO.
 *
 * <p>Cột {@code search_vector} (tsvector) được quản lý bởi database trigger, chỉ đọc.
 */
@Entity
@Table(name = "videos")
@Data
@JsonIgnoreProperties({ "hibernateLazyInitializer", "handler" })
public class Video {
    /** UUID v4 — primary key. */
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    /** ID số nguyên tăng dần, dùng cho recommendation engine. */
    @Column(name = "numeric_id")
    private Integer numericId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /** Tên object trong MinIO. Ẩn khỏi JSON — client dùng stream URL thay thế. */
    @JsonIgnore
    @Column(name = "video_url", nullable = false)
    private String videoUrl;

    /**
     * Trả về URL để client gọi stream video.
     * Nếu videoUrl là URL đầy đủ (http...) thì giữ nguyên, ngược lại trả về endpoint streaming.
     */
    @JsonProperty("videoUrl")
    public String getStreamUrl() {
        if (this.videoUrl.startsWith("http"))
            return this.videoUrl;
        return "/api/videos/stream/" + this.id;
    }

    @Column(name = "thumbnail_url")
    private String thumbnailUrl;

    @Column(nullable = false)
    private String title;

    private String description;

    @Column(name = "duration_seconds")
    private Integer durationSeconds;

    @Column(name = "category_id")
    private Integer categoryId = 0;

    private String format;

    @Column(name = "file_size")
    private Long fileSize;

    /**
     * Trạng thái video: {@code pending} (chờ phân tích), {@code active} (hiển thị),
     * {@code banned} (bị ẩn/từ chối).
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private VideoStatus status = VideoStatus.pending;

    // Search Vector is managed by database trigger, but we can map it if needed.
    // Generally read-only or ignored by JPA for inserts.
    @Column(name = "search_vector", columnDefinition = "tsvector", insertable = false, updatable = false)
    private String searchVector; // Mapping to String is simple for valid TSVECTOR representation if reading is
                                 // needed.

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
