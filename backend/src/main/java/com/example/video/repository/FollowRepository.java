package com.example.video.repository;

import com.example.video.model.Follow;
import com.example.video.model.FollowId;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

/**
 * Repository truy vấn bảng {@code follows}.
 * Khóa chính composite {@code (followerId, followingId)} được khai báo qua {@link FollowId}.
 * Hỗ trợ toggle follow, lấy danh sách following/followers (eager-load user), và batch count.
 */
public interface FollowRepository extends JpaRepository<Follow, FollowId> {
    /** Kiểm tra followerId có đang follow followingId không. */
    boolean existsByFollowerIdAndFollowingId(UUID followerId, UUID followingId);

    /** Hủy follow (dùng khi toggle unfollow). */
    void deleteByFollowerIdAndFollowingId(UUID followerId, UUID followingId);

    /** Lấy danh sách người mà user đang follow, eager-load thông tin {@code following} để tránh N+1. */
    @EntityGraph(attributePaths = "following")
    List<Follow> findByFollowerIdOrderByCreatedAtDesc(UUID followerId);

    /** Lấy danh sách người đang follow user, eager-load thông tin {@code follower} để tránh N+1. */
    @EntityGraph(attributePaths = "follower")
    List<Follow> findByFollowingIdOrderByCreatedAtDesc(UUID followingId);

    /** Đếm số người user đang follow (following count). */
    long countByFollowerId(UUID followerId);

    /** Đếm số người đang follow user (followers count). */
    long countByFollowingId(UUID followingId);

    /**
     * Batch lookup: trả về danh sách followingId mà user đang follow trong tập {@code followingIds}.
     * Dùng để đánh dấu isFollowing=true cho nhiều user trong một lần truy vấn, tránh N+1.
     */
    @Query("""
            SELECT f.followingId
            FROM Follow f
            WHERE f.followerId = :followerId
              AND f.followingId IN :followingIds
            """)
    List<UUID> findFollowingIdsByFollowerIdAndFollowingIdIn(@Param("followerId") UUID followerId,
                                                            @Param("followingIds") Collection<UUID> followingIds);

    /**
     * Batch count followers cho nhiều user cùng lúc.
     * Trả về {@code Object[]}: {@code [followingId, count]} để tránh N+1 khi hiển thị danh sách creator.
     */
    @Query("""
            SELECT f.followingId, COUNT(f)
            FROM Follow f
            WHERE f.followingId IN :userIds
            GROUP BY f.followingId
            """)
    List<Object[]> countFollowersByFollowingIds(@Param("userIds") Collection<UUID> userIds);
}
