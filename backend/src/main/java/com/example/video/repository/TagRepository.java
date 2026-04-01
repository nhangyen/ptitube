package com.example.video.repository;

import com.example.video.model.Tag;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TagRepository extends JpaRepository<Tag, UUID> {
    List<Tag> findByIsActiveTrue();
    Optional<Tag> findByNameIgnoreCase(String name);
    List<Tag> findByCategory(String category);
}
