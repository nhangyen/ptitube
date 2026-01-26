package com.example.video.repository;

import com.example.video.model.VideoMetadata;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VideoRepository extends JpaRepository<VideoMetadata, Long> {
}
