package com.example.video.model;

import jakarta.persistence.*;
import lombok.Data;

import java.util.UUID;

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
