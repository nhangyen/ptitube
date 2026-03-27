package com.example.video.repository;

import com.example.video.model.VideoTag;
import com.example.video.model.VideoTagId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface VideoTagRepository extends JpaRepository<VideoTag, VideoTagId> {
    List<VideoTag> findByVideoId(UUID videoId);
    void deleteByVideoId(UUID videoId);
}
