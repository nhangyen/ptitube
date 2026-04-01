package com.example.video.service;

import com.example.video.model.Tag;
import com.example.video.repository.TagRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class TagService {

    @Autowired
    private TagRepository tagRepository;

    public List<Tag> getAllActiveTags() {
        return tagRepository.findByIsActiveTrue();
    }

    public List<Tag> getTagsByCategory(String category) {
        return tagRepository.findByCategory(category);
    }

    public Tag findOrCreateTag(String name, String category) {
        return tagRepository.findByNameIgnoreCase(name)
                .orElseGet(() -> {
                    Tag tag = new Tag();
                    tag.setName(name);
                    tag.setCategory(category);
                    return tagRepository.save(tag);
                });
    }

    public Tag createTag(String name, String category) {
        if (tagRepository.findByNameIgnoreCase(name).isPresent()) {
            throw new RuntimeException("Tag already exists: " + name);
        }
        Tag tag = new Tag();
        tag.setName(name);
        tag.setCategory(category);
        return tagRepository.save(tag);
    }

    public void deactivateTag(UUID tagId) {
        Tag tag = tagRepository.findById(tagId)
                .orElseThrow(() -> new RuntimeException("Tag not found"));
        tag.setIsActive(false);
        tagRepository.save(tag);
    }
}
