package com.example.video.repository;

import com.example.video.model.AiAnalysisJob;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

/**
 * Spring Data JPA repository cho entity {@link AiAnalysisJob}.
 */
public interface AiAnalysisJobRepository extends JpaRepository<AiAnalysisJob, UUID> {

    /**
     * Lấy lịch sử các AI job của một video (có thể nhiều bản ghi nếu chạy lại
     * sau khi fail). Dùng để hiển thị trạng thái phân tích AI cho moderator.
     */
    List<AiAnalysisJob> findByVideoId(UUID videoId);

    /**
     * Lấy tất cả job có trạng thái cụ thể.
     * Hữu ích cho cronjob dọn dẹp các job {@code processing} bị treo quá lâu.
     */
    List<AiAnalysisJob> findByStatus(String status);
}
