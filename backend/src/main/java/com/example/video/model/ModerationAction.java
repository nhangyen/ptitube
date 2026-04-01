package com.example.video.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "moderation_actions")
@Data
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class ModerationAction {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "queue_id", nullable = false)
    private ModerationQueue queue;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "admin_id", nullable = false)
    private User admin;

    @Column(nullable = false, length = 20)
    private String action;

    @Column(length = 20)
    private String scope;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "target_scene_id")
    private VideoScene targetScene;

    @Column(columnDefinition = "TEXT")
    private String reason;

    @Column(name = "tags_added", columnDefinition = "uuid[]")
    private UUID[] tagsAdded;

    @Column(name = "tags_removed", columnDefinition = "uuid[]")
    private UUID[] tagsRemoved;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
