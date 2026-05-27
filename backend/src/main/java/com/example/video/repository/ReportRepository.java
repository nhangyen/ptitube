package com.example.video.repository;

import com.example.video.model.Report;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

/**
 * Spring Data JPA repository cho entity {@link Report} (báo cáo vi phạm).
 */
public interface ReportRepository extends JpaRepository<Report, UUID> {

    /** Lấy tất cả báo cáo theo trạng thái ({@code open} | {@code resolved}). */
    List<Report> findByStatus(String status);

    /** Lấy tất cả báo cáo cho một video (cả mở và đã đóng). */
    List<Report> findByVideoId(UUID videoId);

    /** Lấy lịch sử các báo cáo do một người dùng tạo. */
    List<Report> findByReporterId(UUID reporterId);

    /** Đếm tổng số báo cáo của một video — hiển thị badge "X reports" trên UI. */
    long countByVideoId(UUID videoId);

    /** Đếm báo cáo theo trạng thái — phục vụ dashboard admin. */
    long countByStatus(String status);

    /**
     * Kiểm tra một user đã từng báo cáo một video chưa,
     * dùng để chặn báo cáo trùng lặp (1 user chỉ báo cáo 1 lần / 1 video).
     */
    boolean existsByReporterIdAndVideoId(UUID reporterId, UUID videoId);
}
