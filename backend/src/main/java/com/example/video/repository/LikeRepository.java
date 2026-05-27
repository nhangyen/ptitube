package com.example.video.repository;

import com.example.video.model.Like;
import com.example.video.model.LikeId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

/**
 * Repository truy vấn bảng {@code likes}.
 * Khóa chính composite {@code (userId, videoId)} được khai báo qua {@link LikeId}.
 * Hỗ trợ toggle like, kiểm tra trạng thái like, và batch lookup để tránh N+1 query.
 */
public interface LikeRepository extends JpaRepository<Like, LikeId> {
    /** Kiểm tra user đã like video chưa. */
    boolean existsByUserIdAndVideoId(UUID userId, UUID videoId);

    /** Xóa like theo userId + videoId (dùng khi toggle unlike). */
    void deleteByUserIdAndVideoId(UUID userId, UUID videoId);

    /** Lấy toàn bộ like của một video. */
    List<Like> findByVideoId(UUID videoId);

    /** Lấy toàn bộ like của một user. */
    List<Like> findByUserId(UUID userId);

    /** Đếm tổng số like của một video. */
    long countByVideoId(UUID videoId);

    /**
     * Batch lookup: trả về danh sách videoId mà user đã like trong tập {@code videoIds}.
     * Dùng để đánh dấu isLiked=true cho nhiều video trong một lần truy vấn, tránh N+1.
     */
    @Query("""
            SELECT l.videoId
            FROM Like l
            WHERE l.userId = :userId
              AND l.videoId IN :videoIds
            """)
    List<UUID> findVideoIdsByUserIdAndVideoIdIn(@Param("userId") UUID userId, @Param("videoIds") Collection<UUID> videoIds);
}
