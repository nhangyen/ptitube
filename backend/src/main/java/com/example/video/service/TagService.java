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

/**
 * Service quản lý tag/hashtag trong hệ thống.
 *
 * <p>Tag được phân loại theo {@code category}: hiện tại chỉ có {@code "hashtag"}
 * (trích xuất từ tiêu đề/mô tả video). Có thể mở rộng thêm các category khác
 * như {@code "genre"} hoặc {@code "ai_label"} trong tương lai.
 *
 * <p>Quy trình gán hashtag khi upload video ({@link #assignHashtagsToVideo}):
 * <ol>
 *   <li>Trích xuất hashtag từ chuỗi tiêu đề + mô tả bằng regex {@code #[\\p{L}\\p{N}_]{2,50}}.</li>
 *   <li>Normalize về chữ thường (lowercase).</li>
 *   <li>Tạo Tag mới nếu chưa tồn tại (find-or-create).</li>
 *   <li>Tạo bản ghi {@code VideoTag} với source="uploader" nếu chưa được gán.</li>
 * </ol>
 */
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

    /** Lấy tất cả tag đang hoạt động (isActive=true). */
    public List<Tag> getAllActiveTags() {
        return tagRepository.findByIsActiveTrue();
    }

    /**
     * Lấy tất cả tag theo category.
     *
     * @param category category cần lọc (vd: "hashtag", "genre")
     * @return danh sách Tag
     */
    public List<Tag> getTagsByCategory(String category) {
        return tagRepository.findByCategory(category);
    }

    /**
     * Tìm tag theo tên (case-insensitive) hoặc tạo mới nếu chưa tồn tại.
     *
     * @param name     tên tag (đã được normalize)
     * @param category category của tag
     * @return Tag entity (có thể mới tạo hoặc đã tồn tại)
     */
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

    /**
     * Trích xuất tất cả hashtag từ chuỗi văn bản bằng regex.
     * Pattern: {@code #[chữ/số/gạch dưới]{2-50}} (hỗ trợ Unicode cho tiếng Việt).
     *
     * @param text chuỗi cần trích xuất hashtag (title, description)
     * @return tập hợp hashtag đã normalize (không trùng, giữ thứ tự xuất hiện)
     */
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

    /**
     * Normalize hashtag: bỏ dấu {@code #}, trim whitespace, chuyển về chữ thường.
     *
     * @param rawTag hashtag thô (có thể có hoặc không có dấu #)
     * @return hashtag đã normalize, hoặc chuỗi rỗng nếu đầu vào null
     */
    public String normalizeHashtag(String rawTag) {
        if (rawTag == null) {
            return "";
        }
        return rawTag.replace("#", "").trim().toLowerCase(Locale.ROOT);
    }

    /**
     * Gán hashtag từ tiêu đề và mô tả vào video. Bỏ qua hashtag đã được gán trước đó.
     * Tự động tạo Tag mới nếu chưa tồn tại.
     *
     * @param video       video cần gán hashtag
     * @param title       tiêu đề video
     * @param description mô tả video (có thể null)
     * @param assignedBy  ID người dùng thực hiện upload (gán vào VideoTag.assignedBy)
     */
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

    /**
     * Lấy danh sách hashtag trending: xếp hạng theo số video active có sử dụng hashtag đó.
     *
     * @param limit số lượng hashtag cần lấy
     * @return danh sách HashtagResponse với tên, displayName (#name) và videoCount
     */
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

    /**
     * Tìm kiếm hashtag theo từ khóa (case-insensitive, tối đa 10 kết quả).
     *
     * @param query từ khóa tìm kiếm (đã được normalize)
     * @return danh sách HashtagResponse với videoCount tương ứng
     */
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
