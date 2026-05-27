package com.example.video.dto;

import lombok.Data;
import java.util.List;
import java.util.UUID;

/**
 * DTO đa năng cho một item trong feed — đại diện cho video gốc hoặc repost.
 *
 * <p>Các field quan trọng:
 * <ul>
 *   <li>{@code entryType} — phân biệt {@code "video"} (video gốc) vs {@code "repost"} (chia sẻ lại).</li>
 *   <li>{@code feedEntryId} — ID duy nhất của entry trong feed (có thể là videoId hoặc repostId).</li>
 *   <li>{@code repostedBy} — thông tin user đã repost (null nếu là video gốc).</li>
 *   <li>{@code score} — điểm xếp hạng từ recommendation engine (dùng để sort feed AI).</li>
 *   <li>{@code activityAt} — thời điểm hoạt động (createdAt hoặc repostedAt), dùng để sort feed chronological.</li>
 * </ul>
 */
@Data
public class VideoFeedItem {
    private UUID id;
    /** ID duy nhất cho entry feed (videoId hoặc repostId). */
    private String feedEntryId;
    /** Loại entry: {@code "video"} hoặc {@code "repost"}. */
    private String entryType;
    private String title;
    private String description;
    private String videoUrl;
    private String thumbnailUrl;
    private Integer durationSeconds;
    /** Tác giả gốc của video. */
    private UserSummary user;
    /** User đã repost (null nếu entryType = "video"). */
    private UserSummary repostedBy;
    private VideoStatsDto stats;
    private List<String> hashtags;
    /** {@code true} nếu user đang đăng nhập đã like video này. */
    private boolean likedByCurrentUser;
    /** {@code true} nếu user đang đăng nhập đã repost video này. */
    private boolean currentUserHasReposted;
    private String createdAt;
    /** Thời điểm hoạt động gần nhất (createdAt hoặc repostedAt) — dùng để sort feed. */
    private String activityAt;
    private String repostedAt;
    /** Điểm xếp hạng từ recommendation engine; cao hơn → ưu tiên hơn trong feed AI. */
    private double score;

    /** Thông tin tóm tắt user dùng trong feed item. */
    @Data
    public static class UserSummary {
        private UUID id;
        private String username;
        private String avatarUrl;
        /** {@code true} nếu user đang đăng nhập đang follow creator này. */
        private boolean followedByCurrentUser;
    }

    /** Thống kê tổng hợp của video — views, likes, comments, shares, reposts. */
    @Data
    public static class VideoStatsDto {
        private long viewCount;
        private long likeCount;
        private long commentCount;
        private long shareCount;
        private long repostCount;
    }
}
