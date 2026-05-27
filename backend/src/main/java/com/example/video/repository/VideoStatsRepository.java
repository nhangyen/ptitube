package com.example.video.repository;

import com.example.video.model.VideoStats;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository truy vấn bảng {@code video_stats}.
 * Mỗi video có đúng một bản ghi stats được tạo tự động bởi DB trigger khi insert video.
 * Các counter (view, like, share) được cập nhật thủ công trong service, không dùng trigger để tăng.
 */
public interface VideoStatsRepository extends JpaRepository<VideoStats, UUID> {
    /** Lấy stats theo videoId — dùng khi hiển thị chi tiết video. */
    Optional<VideoStats> findByVideoId(UUID videoId);

    /** Batch load stats cho nhiều video — dùng để tránh N+1 khi render danh sách video. */
    List<VideoStats> findByVideoIdIn(Collection<UUID> videoIds);

    /** JPQL thay thế cho {@link #findByVideoId} — cùng kết quả, giữ lại cho tính tường minh. */
    @Query("SELECT vs FROM VideoStats vs WHERE vs.videoId = :videoId")
    Optional<VideoStats> getStatsByVideoId(@Param("videoId") UUID videoId);

    /**
     * Tính tổng like của nhiều video trong một lần truy vấn.
     * {@code COALESCE(..., 0)} đảm bảo trả về 0 khi không có video nào có stats.
     */
    @Query("""
            SELECT COALESCE(SUM(vs.likeCount), 0)
            FROM VideoStats vs
            WHERE vs.videoId IN :videoIds
            """)
    long sumLikeCountByVideoIds(@Param("videoIds") Collection<UUID> videoIds);
}
