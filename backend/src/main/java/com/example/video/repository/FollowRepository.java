package com.example.video.repository;

import com.example.video.model.Follow;
import com.example.video.model.FollowId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface FollowRepository extends JpaRepository<Follow, FollowId> {
    boolean existsByFollowerIdAndFollowingId(UUID followerId, UUID followingId);
    void deleteByFollowerIdAndFollowingId(UUID followerId, UUID followingId);
    List<Follow> findByFollowerId(UUID followerId);
    List<Follow> findByFollowingId(UUID followingId);
    long countByFollowerId(UUID followerId); // Following count
    long countByFollowingId(UUID followingId); // Followers count
}
