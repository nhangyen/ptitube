package com.example.video.repository;

import com.example.video.model.Notification;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {
    List<Notification> findByRecipientIdOrderByCreatedAtDesc(UUID recipientId, Pageable pageable);
    List<Notification> findByRecipientIdAndIsReadFalse(UUID recipientId);
    long countByRecipientIdAndIsReadFalse(UUID recipientId);
}
