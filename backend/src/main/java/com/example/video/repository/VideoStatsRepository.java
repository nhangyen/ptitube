package com.example.video.repository;

import com.example.video.model.VideoStats;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface VideoStatsRepository extends JpaRepository<VideoStats, UUID> {
    Optional<VideoStats> findByVideoId(UUID videoId);
    List<VideoStats> findByVideoIdIn(Collection<UUID> videoIds);
    
    @Query("SELECT vs FROM VideoStats vs WHERE vs.videoId = :videoId")
    Optional<VideoStats> getStatsByVideoId(@Param("videoId") UUID videoId);

    @Query("""
            SELECT COALESCE(SUM(vs.likeCount), 0)
            FROM VideoStats vs
            WHERE vs.videoId IN :videoIds
            """)
    long sumLikeCountByVideoIds(@Param("videoIds") Collection<UUID> videoIds);
}
