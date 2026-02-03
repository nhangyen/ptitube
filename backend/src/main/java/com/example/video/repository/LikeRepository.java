package com.example.video.repository;

import com.example.video.model.Like;
import com.example.video.model.LikeId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface LikeRepository extends JpaRepository<Like, LikeId> {
    boolean existsByUserIdAndVideoId(UUID userId, UUID videoId);
    void deleteByUserIdAndVideoId(UUID userId, UUID videoId);
    List<Like> findByVideoId(UUID videoId);
    List<Like> findByUserId(UUID userId);
    long countByVideoId(UUID videoId);
}
