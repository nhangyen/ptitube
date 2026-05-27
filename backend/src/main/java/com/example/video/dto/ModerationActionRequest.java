package com.example.video.dto;

import lombok.Data;

import java.util.List;
import java.util.UUID;

/**
 * DTO request cho các endpoint phán quyết: approve / reject / review.
 *
 * <p>Tất cả các trường đều optional ở mức kỹ thuật, nhưng business rule yêu cầu
 * {@code reason} bắt buộc khi từ chối video (validation ở phía client).</p>
 */
@Data
public class ModerationActionRequest {

    /**
     * Lý do/ghi chú của moderator.
     * Bắt buộc cho {@code reject}, optional cho {@code approve} và {@code reviewed}.
     */
    private String reason;

    /**
     * UUID cảnh cụ thể bị tác động (chỉ dùng khi hành động ở phạm vi {@code scene}).
     * Hiện tại chưa được dùng trực tiếp ở các endpoint approve/reject (luôn ở scope=video).
     */
    private UUID targetSceneId;

    /** Danh sách tag cần thêm vào cảnh (dùng cho action retag). */
    private List<UUID> tagsToAdd;

    /** Danh sách tag cần xoá khỏi cảnh (dùng cho action retag). */
    private List<UUID> tagsToRemove;
}
