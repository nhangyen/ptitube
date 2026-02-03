package com.example.video.repository;

import com.example.video.model.Comment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface CommentRepository extends JpaRepository<Comment, UUID> {
    List<Comment> findByVideoIdAndParentIsNullOrderByCreatedAtDesc(UUID videoId);
    List<Comment> findByVideoIdOrderByCreatedAtDesc(UUID videoId);
    List<Comment> findByParentIdOrderByCreatedAtAsc(UUID parentId);
    long countByVideoId(UUID videoId);
    
    @Query("SELECT c FROM Comment c WHERE c.video.id = :videoId AND c.parent IS NULL ORDER BY c.createdAt DESC")
    List<Comment> findTopLevelComments(@Param("videoId") UUID videoId);
}
