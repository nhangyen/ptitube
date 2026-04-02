package com.example.video.repository;

import com.example.video.model.Follow;
import com.example.video.model.FollowId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface FollowRepository extends JpaRepository<Follow, FollowId> {
    boolean existsByFollowerIdAndFollowingId(UUID followerId, UUID followingId);
    void deleteByFollowerIdAndFollowingId(UUID followerId, UUID followingId);
    List<Follow> findByFollowerId(UUID followerId);
    List<Follow> findByFollowingId(UUID followingId);
    long countByFollowerId(UUID followerId); // Following count
    long countByFollowingId(UUID followingId); // Followers count

    @Query("""
            SELECT f.followingId
            FROM Follow f
            WHERE f.followerId = :followerId
              AND f.followingId IN :followingIds
            """)
    List<UUID> findFollowingIdsByFollowerIdAndFollowingIdIn(@Param("followerId") UUID followerId,
                                                            @Param("followingIds") Collection<UUID> followingIds);

    @Query("""
            SELECT f.followingId, COUNT(f)
            FROM Follow f
            WHERE f.followingId IN :userIds
            GROUP BY f.followingId
            """)
    List<Object[]> countFollowersByFollowingIds(@Param("userIds") Collection<UUID> userIds);
}
