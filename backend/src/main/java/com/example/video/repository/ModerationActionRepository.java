package com.example.video.repository;

import com.example.video.model.ModerationAction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

/**
 * Spring Data JPA repository cho entity {@link ModerationAction} (audit trail).
 *
 * <p>Bảng audit chỉ insert, không update/delete — repository này không expose
 * các phương thức xoá; chỉ kế thừa save() và find() từ {@link JpaRepository}.</p>
 */
public interface ModerationActionRepository extends JpaRepository<ModerationAction, UUID> {

    /**
     * Lấy lịch sử hành động của một hàng chờ, mới nhất trước.
     * Dùng để hiển thị timeline kiểm duyệt cho moderator/admin.
     */
    List<ModerationAction> findByQueueIdOrderByCreatedAtDesc(UUID queueId);
}
