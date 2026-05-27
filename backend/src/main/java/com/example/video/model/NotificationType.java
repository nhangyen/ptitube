package com.example.video.model;

/**
 * Enum loại thông báo trong hệ thống.
 */
public enum NotificationType {
    /** Ai đó like video của bạn. */
    like,
    /** Ai đó bình luận lên video của bạn. */
    comment,
    /** Ai đó bắt đầu follow bạn. */
    follow,
    /** Ai đó reply vào bình luận của bạn. */
    reply
}
