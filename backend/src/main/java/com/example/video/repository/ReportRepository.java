package com.example.video.repository;

import com.example.video.model.Report;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ReportRepository extends JpaRepository<Report, UUID> {
    List<Report> findByStatus(String status);
    List<Report> findByVideoId(UUID videoId);
    List<Report> findByReporterId(UUID reporterId);
    long countByVideoId(UUID videoId);
    long countByStatus(String status);
    boolean existsByReporterIdAndVideoId(UUID reporterId, UUID videoId);
}
