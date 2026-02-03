package com.example.video.repository;

import com.example.video.model.Video;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface VideoRepository extends JpaRepository<Video, UUID> {
    // Add custom queries if needed
}
