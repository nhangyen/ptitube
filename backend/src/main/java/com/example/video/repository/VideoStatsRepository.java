package com.example.video.repository;

import com.example.video.model.VideoStats;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface VideoStatsRepository extends JpaRepository<VideoStats, UUID> {
    Optional<VideoStats> findByVideoId(UUID videoId);
    
    @Query("SELECT vs FROM VideoStats vs WHERE vs.videoId = :videoId")
    Optional<VideoStats> getStatsByVideoId(@Param("videoId") UUID videoId);
}
