package com.example.video.repository;

import com.example.video.model.VideoView;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.UUID;

/**
 * Repository truy vấn bảng {@code video_views}.
 * Mỗi bản ghi lưu một lượt xem: userId, videoId, watchDuration, isCompleted, viewedAt.
 * Dữ liệu được dùng cho recommendation engine (CSV export) và dashboard creator.
 */
public interface VideoViewRepository extends JpaRepository<VideoView, UUID> {
    /** Đếm tổng số lượt xem (kể cả xem lại) của một user. */
    long countByUserId(UUID userId);

    /** Đếm số video khác nhau mà user đã xem — dùng cho thống kê "watched X videos". */
    @Query("SELECT COUNT(DISTINCT vv.videoId) FROM VideoView vv WHERE vv.userId = :userId")
    long countDistinctVideosWatched(@Param("userId") UUID userId);
}
