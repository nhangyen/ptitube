package com.example.video.dto;

import lombok.Data;

import java.util.UUID;

/**
 * Response cho một thông báo, bao gồm loại sự kiện, nội dung, trạng thái đọc,
 * thông tin user gây ra sự kiện (actor) và tham chiếu video/comment liên quan.
 */
@Data
public class NotificationResponse {
    private UUID id;
    /** Loại thông báo: {@code like}, {@code comment}, {@code follow}, {@code reply}. */
    private String type;
    /** Nội dung thông báo đã được format, ví dụ: "user123 đã thích video của bạn". */
    private String message;
    /** {@code true} nếu user đã đọc thông báo này. */
    private boolean read;
    private String createdAt;
    /** Thông tin tóm tắt của user thực hiện hành động. */
    private ActorSummary actor;
    /** ID video liên quan (null nếu là thông báo follow). */
    private UUID videoId;
    private String videoTitle;
    private String videoThumbnailUrl;
    /** ID bình luận liên quan (null nếu không phải thông báo comment/reply). */
    private UUID commentId;

    /** Thông tin tóm tắt user dùng trong response thông báo. */
    @Data
    public static class ActorSummary {
        private UUID id;
        private String username;
        private String avatarUrl;
    }
}
