package com.example.video.model;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "scene_tags")
@Data
@IdClass(SceneTagId.class)
public class SceneTag {
    @Id
    @Column(name = "scene_id")
    private UUID sceneId;

    @Id
    @Column(name = "tag_id")
    private UUID tagId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "scene_id", insertable = false, updatable = false)
    private VideoScene scene;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tag_id", insertable = false, updatable = false)
    private Tag tag;

    @Column(nullable = false, length = 20)
    private String source;

    private Double confidence;

    @Column(name = "assigned_by")
    private UUID assignedBy;

    @CreationTimestamp
    @Column(name = "assigned_at", updatable = false)
    private LocalDateTime assignedAt;
}
