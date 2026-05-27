package com.example.video.repository;

import com.example.video.model.Notification;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

/**
 * Repository truy vấn bảng {@code notifications}.
 * Hỗ trợ phân trang thông báo, lấy thông báo chưa đọc, và đếm số chưa đọc để hiển thị badge.
 */
public interface NotificationRepository extends JpaRepository<Notification, UUID> {
    /** Lấy thông báo của recipient, mới nhất trước, có hỗ trợ phân trang. */
    List<Notification> findByRecipientIdOrderByCreatedAtDesc(UUID recipientId, Pageable pageable);

    /** Lấy toàn bộ thông báo chưa đọc của recipient (dùng khi markAllAsRead). */
    List<Notification> findByRecipientIdAndIsReadFalse(UUID recipientId);

    /** Đếm số thông báo chưa đọc để hiển thị badge trên UI. */
    long countByRecipientIdAndIsReadFalse(UUID recipientId);
}
