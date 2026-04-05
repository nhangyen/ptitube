package com.example.video.repository;

import com.example.video.model.VideoView;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.UUID;

public interface VideoViewRepository extends JpaRepository<VideoView, UUID> {

    long countByUserId(UUID userId);

    @Query("SELECT COUNT(DISTINCT vv.videoId) FROM VideoView vv WHERE vv.userId = :userId")
    long countDistinctVideosWatched(@Param("userId") UUID userId);
}
