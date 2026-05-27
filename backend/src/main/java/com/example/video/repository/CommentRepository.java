package com.example.video.repository;

import com.example.video.model.Comment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

/**
 * Repository truy vấn bảng {@code comments}.
 * Hỗ trợ lấy bình luận theo video, bình luận top-level và bình luận con (replies).
 */
public interface CommentRepository extends JpaRepository<Comment, UUID> {
    /** Lấy các bình luận gốc (không có parent) của video, mới nhất trước. */
    List<Comment> findByVideoIdAndParentIsNullOrderByCreatedAtDesc(UUID videoId);

    /** Lấy tất cả bình luận của video (flat list), mới nhất trước. */
    List<Comment> findByVideoIdOrderByCreatedAtDesc(UUID videoId);

    /** Lấy tất cả bình luận con (replies) của một bình luận cha, cũ nhất trước. */
    List<Comment> findByParentIdOrderByCreatedAtAsc(UUID parentId);

    /** Đếm tổng số bình luận của video. */
    long countByVideoId(UUID videoId);

    /** Lấy bình luận gốc (top-level) của video bằng JPQL, mới nhất trước. */
    @Query("SELECT c FROM Comment c WHERE c.video.id = :videoId AND c.parent IS NULL ORDER BY c.createdAt DESC")
    List<Comment> findTopLevelComments(@Param("videoId") UUID videoId);
}
