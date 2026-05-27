package com.example.video.repository;

import com.example.video.model.SceneTag;
import com.example.video.model.SceneTagId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

/**
 * Spring Data JPA repository cho {@link SceneTag} (bảng nối nhiều-nhiều).
 *
 * <p>Sử dụng composite key {@link SceneTagId} làm ID cho operations cơ bản.</p>
 */
public interface SceneTagRepository extends JpaRepository<SceneTag, SceneTagId> {

    /** Lấy tất cả tag (cả AI và admin) của một cảnh. */
    List<SceneTag> findBySceneId(UUID sceneId);

    /**
     * Xoá một tag cụ thể khỏi cảnh.
     * Spring Data tự sinh statement DELETE theo composite key.
     */
    void deleteBySceneIdAndTagId(UUID sceneId, UUID tagId);
}
