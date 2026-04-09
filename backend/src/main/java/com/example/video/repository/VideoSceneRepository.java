package com.example.video.repository;

import com.example.video.model.VideoScene;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface VideoSceneRepository extends JpaRepository<VideoScene, UUID> {
    List<VideoScene> findByVideoIdOrderBySceneIndex(UUID videoId);
    long countByVideoId(UUID videoId);
}
