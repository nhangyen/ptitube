package com.example.video.dto;

import lombok.Data;
import java.util.UUID;
import java.util.List;

/**
 * Response cho một bình luận, bao gồm thông tin tác giả và danh sách reply lồng nhau.
 * Cấu trúc tree được giữ ở 2 cấp: bình luận gốc chứa list {@code replies},
 * và mỗi reply không lồng thêm (flat). Tránh serialize vòng lặp vô tận.
 */
@Data
public class CommentResponse {
    private UUID id;
    private String content;
    /** Thông tin tóm tắt của tác giả bình luận. */
    private UserSummary user;
    private String createdAt;
    /** Danh sách reply của bình luận gốc (rỗng nếu là reply). */
    private List<CommentResponse> replies;

    /** Thông tin tóm tắt user dùng trong response bình luận. */
    @Data
    public static class UserSummary {
        private UUID id;
        private String username;
        private String avatarUrl;
    }
}
