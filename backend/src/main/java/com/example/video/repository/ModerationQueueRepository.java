package com.example.video.repository;

import com.example.video.model.ModerationQueue;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

/**
 * Spring Data JPA repository cho entity {@link ModerationQueue}.
 *
 * <p>Cung cấp các phương thức truy vấn được dẫn xuất từ tên (derived queries).
 * Spring Data tự động sinh implementation lúc runtime.</p>
 */
public interface ModerationQueueRepository extends JpaRepository<ModerationQueue, UUID> {

    /** Lấy hàng chờ theo trạng thái, sắp xếp mới nhất trước. */
    Page<ModerationQueue> findByStatusOrderByCreatedAtDesc(String status, Pageable pageable);

    /** Lấy tất cả hàng chờ, sắp xếp mới nhất trước. */
    Page<ModerationQueue> findAllByOrderByCreatedAtDesc(Pageable pageable);

    /** Lấy các bản ghi hàng chờ của một video cụ thể (có thể nhiều nếu chạy lại AI). */
    List<ModerationQueue> findByVideoId(UUID videoId);

    /** Lấy các bản ghi đã gán cho một moderator nhất định. */
    List<ModerationQueue> findByAssignedToId(UUID userId);

    /** Đếm số hàng chờ theo trạng thái — phục vụ badge số lượng trên UI. */
    long countByStatus(String status);
}
