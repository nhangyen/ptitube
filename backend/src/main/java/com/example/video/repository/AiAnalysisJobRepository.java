package com.example.video.repository;

import com.example.video.model.AiAnalysisJob;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface AiAnalysisJobRepository extends JpaRepository<AiAnalysisJob, UUID> {
    List<AiAnalysisJob> findByVideoId(UUID videoId);
    List<AiAnalysisJob> findByStatus(String status);
}
