package com.example.video.repository;

import com.example.video.model.VideoRepost;
import com.example.video.model.VideoStatus;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository truy vấn bảng {@code video_reposts}.
 * Mỗi user chỉ được repost một video một lần (unique constraint trên {@code (user_id, video_id)}).
 * Các query JOIN FETCH eager-load user và video để tránh N+1 khi render feed.
 */
public interface VideoRepostRepository extends JpaRepository<VideoRepost, UUID> {
    /** Kiểm tra user đã repost video chưa (dùng trước khi tạo repost mới). */
    @Query("""
            SELECT CASE WHEN COUNT(vr) > 0 THEN true ELSE false END
            FROM VideoRepost vr
            WHERE vr.user.id = :userId
              AND vr.video.id = :videoId
            """)
    boolean existsByUserIdAndVideoId(@Param("userId") UUID userId, @Param("videoId") UUID videoId);

    /** Tìm bản ghi repost cụ thể của user cho video (dùng khi xóa repost). */
    @Query("""
            SELECT vr
            FROM VideoRepost vr
            WHERE vr.user.id = :userId
              AND vr.video.id = :videoId
            """)
    Optional<VideoRepost> findByUserIdAndVideoId(@Param("userId") UUID userId, @Param("videoId") UUID videoId);

    /** Xóa repost theo userId + videoId, yêu cầu {@code @Modifying} vì là DML. */
    @Modifying
    @Query("""
            DELETE FROM VideoRepost vr
            WHERE vr.user.id = :userId
              AND vr.video.id = :videoId
            """)
    void deleteByUserIdAndVideoId(@Param("userId") UUID userId, @Param("videoId") UUID videoId);

    /** Lấy danh sách repost active của user, eager-load user và video (tránh N+1), mới nhất trước. */
    @Query("""
            SELECT vr
            FROM VideoRepost vr
            JOIN FETCH vr.user
            JOIN FETCH vr.video v
            JOIN FETCH v.user
            WHERE vr.user.id = :userId
              AND v.status = :status
            ORDER BY vr.createdAt DESC
            """)
    List<VideoRepost> findActiveByUserIdOrderByCreatedAtDesc(@Param("userId") UUID userId,
                                                             @Param("status") VideoStatus status);

    /** Lấy repost active của nhiều user (dùng cho feed), có phân trang, eager-load đầy đủ. */
    @Query("""
            SELECT vr
            FROM VideoRepost vr
            JOIN FETCH vr.user
            JOIN FETCH vr.video v
            JOIN FETCH v.user
            WHERE vr.user.id IN :userIds
              AND v.status = :status
            ORDER BY vr.createdAt DESC
            """)
    List<VideoRepost> findActiveByUserIdsOrderByCreatedAtDesc(@Param("userIds") Collection<UUID> userIds,
                                                              @Param("status") VideoStatus status,
                                                              Pageable pageable);

    /** Kiểm tra repost tồn tại và video vẫn active — dùng khi hiển thị repost trong feed. */
    @Query("""
            SELECT vr
            FROM VideoRepost vr
            JOIN FETCH vr.user
            JOIN FETCH vr.video v
            JOIN FETCH v.user
            WHERE vr.user.id = :userId
              AND vr.video.id = :videoId
              AND v.status = :status
            """)
    Optional<VideoRepost> findActiveByUserIdAndVideoId(@Param("userId") UUID userId,
                                                       @Param("videoId") UUID videoId,
                                                       @Param("status") VideoStatus status);

    /**
     * Batch lookup: trả về danh sách videoId đã được user repost trong tập {@code videoIds}.
     * Dùng để đánh dấu isReposted=true cho nhiều video trong một lần truy vấn.
     */
    @Query("""
            SELECT vr.video.id
            FROM VideoRepost vr
            WHERE vr.user.id = :userId
              AND vr.video.id IN :videoIds
            """)
    List<UUID> findVideoIdsByUserIdAndVideoIdIn(@Param("userId") UUID userId,
                                                @Param("videoIds") Collection<UUID> videoIds);

    /**
     * Batch count repost theo video — trả về {@code Object[]}: {@code [videoId, count]}.
     * Dùng để điền shareCount vào response mà không cần N+1 query.
     */
    @Query("""
            SELECT vr.video.id, COUNT(vr)
            FROM VideoRepost vr
            WHERE vr.video.id IN :videoIds
            GROUP BY vr.video.id
            """)
    List<Object[]> countByVideoIds(@Param("videoIds") Collection<UUID> videoIds);

    /** Đếm số repost active của user (dùng cho dashboard creator). */
    @Query("""
            SELECT COUNT(vr)
            FROM VideoRepost vr
            JOIN vr.video v
            WHERE vr.user.id = :userId
              AND v.status = :status
            """)
    long countActiveByUserIdAndVideoStatus(@Param("userId") UUID userId,
                                           @Param("status") VideoStatus status);
}
