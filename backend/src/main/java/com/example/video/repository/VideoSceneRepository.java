package com.example.video.repository;

import com.example.video.model.VideoScene;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

/**
 * Spring Data JPA repository cho entity {@link VideoScene}.
 */
public interface VideoSceneRepository extends JpaRepository<VideoScene, UUID> {

    /**
     * Lấy danh sách cảnh của một video, sắp xếp theo {@code sceneIndex} tăng dần
     * (đúng thứ tự xuất hiện trong video).
     */
    List<VideoScene> findByVideoIdOrderBySceneIndex(UUID videoId);

    /** Đếm số cảnh của một video — phục vụ hiển thị "X scenes" trên UI moderator. */
    long countByVideoId(UUID videoId);
}
