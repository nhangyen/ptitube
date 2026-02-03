package com.example.video.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Data;

import java.util.UUID;

@Entity
@Table(name = "video_stats")
@Data
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class VideoStats {
    @Id
    @Column(name = "video_id")
    private UUID videoId;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "video_id")
    private Video video;

    @Column(name = "view_count")
    private Long viewCount = 0L;

    @Column(name = "like_count")
    private Long likeCount = 0L;

    @Column(name = "comment_count")
    private Long commentCount = 0L;

    @Column(name = "share_count")
    private Long shareCount = 0L;
}
