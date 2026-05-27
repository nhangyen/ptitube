package com.example.video.dto;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * DTO response gửi về mobile app cho mỗi bản ghi hàng chờ kiểm duyệt.
 *
 * <p>Đã gộp đầy đủ thông tin cần hiển thị trên card UI ở màn hình danh sách:
 * thumbnail, tiêu đề, uploader, mức ưu tiên, số cảnh, số báo cáo, thời gian.</p>
 *
 * <p>Tránh trả về entity {@code ModerationQueue} trực tiếp để không lộ
 * các thông tin nhạy cảm (password hash của user, internal flags…)
 * và giảm payload network.</p>
 */
@Data
public class ModerationQueueResponse {
    /** UUID của bản ghi {@code moderation_queue}. */
    private UUID queueId;

    /** UUID video tương ứng. */
    private UUID videoId;

    /** Tiêu đề video. */
    private String videoTitle;

    /** URL thumbnail video (MinIO). */
    private String videoThumbnail;

    /** Username người upload video. */
    private String uploaderUsername;

    /** UUID người upload (để mobile có thể link đến profile). */
    private UUID uploaderId;

    /** Mức ưu tiên: {@code normal} | {@code high}. */
    private String priority;

    /** Trạng thái hàng chờ: {@code pending} | {@code in_review} | {@code reviewed}. */
    private String status;

    /** Username moderator đang xử lý (null nếu chưa ai nhận). */
    private String assignedTo;

    /** Trạng thái AI job: {@code processing} | {@code completed} | {@code failed}. */
    private String aiJobStatus;

    /** Số cảnh phát hiện được. */
    private Integer sceneCount;

    /** Số báo cáo vi phạm từ người dùng. */
    private Long reportCount;

    /** Trạng thái video: {@code pending} | {@code active} | {@code banned}. */
    private String videoStatus;

    /** JSON các cảnh báo tự động (auto flags). */
    private String autoFlags;

    /** Thời điểm tạo bản ghi hàng chờ. */
    private LocalDateTime createdAt;
}
