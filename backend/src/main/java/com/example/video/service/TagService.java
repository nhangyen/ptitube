package com.example.video.service;

import com.example.video.dto.HashtagResponse;
import com.example.video.model.Tag;
import com.example.video.model.Video;
import com.example.video.model.VideoStatus;
import com.example.video.model.VideoTag;
import com.example.video.repository.TagRepository;
import com.example.video.repository.VideoRepository;
import com.example.video.repository.VideoTagRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class TagService {
    private static final String HASHTAG_CATEGORY = "hashtag";
    private static final Pattern HASHTAG_PATTERN = Pattern.compile("(?<!\\w)#([\\p{L}\\p{N}_]{2,50})");

    @Autowired
    private TagRepository tagRepository;

    @Autowired
    private VideoTagRepository videoTagRepository;

    @Autowired
    private VideoRepository videoRepository;

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

    public Set<String> extractHashtags(String text) {
        if (text == null || text.isBlank()) {
            return Collections.emptySet();
        }

        Matcher matcher = HASHTAG_PATTERN.matcher(text);
        Set<String> hashtags = new LinkedHashSet<>();
        while (matcher.find()) {
            hashtags.add(normalizeHashtag(matcher.group(1)));
        }
        return hashtags;
    }

    public String normalizeHashtag(String rawTag) {
        if (rawTag == null) {
            return "";
        }
        return rawTag.replace("#", "").trim().toLowerCase(Locale.ROOT);
    }

    public void assignHashtagsToVideo(Video video, String title, String description, UUID assignedBy) {
        String joinedText = String.join(" ",
                title == null ? "" : title,
                description == null ? "" : description
        );

        for (String hashtag : extractHashtags(joinedText)) {
            if (hashtag.isBlank()) {
                continue;
            }

            Tag tag = findOrCreateTag(hashtag, HASHTAG_CATEGORY);
            if (videoTagRepository.existsByVideoIdAndTagId(video.getId(), tag.getId())) {
                continue;
            }

            VideoTag videoTag = new VideoTag();
            videoTag.setVideoId(video.getId());
            videoTag.setTagId(tag.getId());
            videoTag.setSource("uploader");
            videoTag.setWeight(1.0);
            videoTag.setAssignedBy(assignedBy);
            videoTagRepository.save(videoTag);
        }
    }

    public List<HashtagResponse> getTrendingHashtags(int limit) {
        return videoTagRepository.findTopTagCountsByCategoryAndStatus(HASHTAG_CATEGORY, VideoStatus.active.name(), limit)
                .stream()
                .map(entry -> {
                    HashtagResponse response = new HashtagResponse();
                    response.setName((String) entry[1]);
                    response.setDisplayName("#" + entry[1]);
                    response.setVideoCount(((Number) entry[2]).longValue());
                    return response;
                })
                .collect(Collectors.toList());
    }

    public List<HashtagResponse> searchHashtags(String query) {
        List<Tag> hashtags = tagRepository.findTop10ByCategoryAndNameContainingIgnoreCaseOrderByNameAsc(
                HASHTAG_CATEGORY,
                normalizeHashtag(query)
        );
        Map<UUID, Long> countsByTagId = hashtags.isEmpty()
                ? Collections.emptyMap()
                : videoTagRepository.countDistinctVideoIdsByTagIds(
                                hashtags.stream().map(Tag::getId).collect(Collectors.toList()))
                        .stream()
                        .collect(Collectors.toMap(
                                row -> (UUID) row[0],
                                row -> ((Number) row[1]).longValue()
                        ));

        return hashtags.stream()
                .map(tag -> {
                    HashtagResponse response = new HashtagResponse();
                    response.setName(tag.getName());
                    response.setDisplayName("#" + tag.getName());
                    response.setVideoCount(countsByTagId.getOrDefault(tag.getId(), 0L));
                    return response;
                })
                .collect(Collectors.toList());
    }
}
