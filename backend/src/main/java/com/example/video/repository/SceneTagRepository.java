package com.example.video.repository;

import com.example.video.model.SceneTag;
import com.example.video.model.SceneTagId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface SceneTagRepository extends JpaRepository<SceneTag, SceneTagId> {
    List<SceneTag> findBySceneId(UUID sceneId);
    void deleteBySceneIdAndTagId(UUID sceneId, UUID tagId);
}
