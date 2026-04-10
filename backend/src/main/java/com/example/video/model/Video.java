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

@Entity
@Table(name = "videos")
@Data
@JsonIgnoreProperties({ "hibernateLazyInitializer", "handler" })
public class Video {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "numeric_id")
    private Integer numericId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @JsonIgnore
    @Column(name = "video_url", nullable = false)
    private String videoUrl;

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
