package com.example.video.repository;

import com.example.video.model.Like;
import com.example.video.model.LikeId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface LikeRepository extends JpaRepository<Like, LikeId> {
    boolean existsByUserIdAndVideoId(UUID userId, UUID videoId);
    void deleteByUserIdAndVideoId(UUID userId, UUID videoId);
    List<Like> findByVideoId(UUID videoId);
    List<Like> findByUserId(UUID userId);
    long countByVideoId(UUID videoId);

    @Query("""
            SELECT l.videoId
            FROM Like l
            WHERE l.userId = :userId
              AND l.videoId IN :videoIds
            """)
    List<UUID> findVideoIdsByUserIdAndVideoIdIn(@Param("userId") UUID userId, @Param("videoIds") Collection<UUID> videoIds);
}
