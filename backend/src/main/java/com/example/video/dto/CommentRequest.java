package com.example.video.dto;

import lombok.Data;
import java.util.UUID;

/**
 * Request body cho endpoint thêm bình luận {@code POST /api/social/comments}.
 * Nếu {@code parentId} là null thì đây là bình luận gốc (top-level);
 * nếu có giá trị thì là bình luận con (reply) của bình luận cha tương ứng.
 */
@Data
public class CommentRequest {
    private UUID videoId;
    /** ID bình luận cha; null nếu là bình luận gốc. */
    private UUID parentId;
    private String content;
}
