package com.example.video.repository;

import com.example.video.model.ModerationQueue;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ModerationQueueRepository extends JpaRepository<ModerationQueue, UUID> {
    Page<ModerationQueue> findByStatusOrderByCreatedAtDesc(String status, Pageable pageable);
    Page<ModerationQueue> findAllByOrderByCreatedAtDesc(Pageable pageable);
    List<ModerationQueue> findByVideoId(UUID videoId);
    List<ModerationQueue> findByAssignedToId(UUID userId);
}
