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

public interface VideoRepostRepository extends JpaRepository<VideoRepost, UUID> {
    @Query("""
            SELECT CASE WHEN COUNT(vr) > 0 THEN true ELSE false END
            FROM VideoRepost vr
            WHERE vr.user.id = :userId
              AND vr.video.id = :videoId
            """)
    boolean existsByUserIdAndVideoId(@Param("userId") UUID userId, @Param("videoId") UUID videoId);

    @Query("""
            SELECT vr
            FROM VideoRepost vr
            WHERE vr.user.id = :userId
              AND vr.video.id = :videoId
            """)
    Optional<VideoRepost> findByUserIdAndVideoId(@Param("userId") UUID userId, @Param("videoId") UUID videoId);

    @Modifying
    @Query("""
            DELETE FROM VideoRepost vr
            WHERE vr.user.id = :userId
              AND vr.video.id = :videoId
            """)
    void deleteByUserIdAndVideoId(@Param("userId") UUID userId, @Param("videoId") UUID videoId);

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

    @Query("""
            SELECT vr.video.id
            FROM VideoRepost vr
            WHERE vr.user.id = :userId
              AND vr.video.id IN :videoIds
            """)
    List<UUID> findVideoIdsByUserIdAndVideoIdIn(@Param("userId") UUID userId,
                                                @Param("videoIds") Collection<UUID> videoIds);

    @Query("""
            SELECT vr.video.id, COUNT(vr)
            FROM VideoRepost vr
            WHERE vr.video.id IN :videoIds
            GROUP BY vr.video.id
            """)
    List<Object[]> countByVideoIds(@Param("videoIds") Collection<UUID> videoIds);

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
