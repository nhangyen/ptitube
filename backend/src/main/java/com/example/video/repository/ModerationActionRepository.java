package com.example.video.repository;

import com.example.video.model.ModerationAction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ModerationActionRepository extends JpaRepository<ModerationAction, UUID> {
    List<ModerationAction> findByQueueIdOrderByCreatedAtDesc(UUID queueId);
}
