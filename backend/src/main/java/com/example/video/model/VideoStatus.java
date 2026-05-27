package com.example.video.model;

/**
 * Enum trạng thái vòng đời của video.
 * <ul>
 *   <li>{@code pending} — Vừa upload, đang chờ AI phân tích.</li>
 *   <li>{@code active} — Đang hiển thị trên feed (AI phân tích xong hoặc fail-open).</li>
 *   <li>{@code failed} — AI phân tích thất bại (hiện không dùng do fail-open policy).</li>
 *   <li>{@code banned} — Bị kiểm duyệt từ chối hoặc admin ẩn.</li>
 * </ul>
 */
public enum VideoStatus {
    /** Chờ AI phân tích sau khi upload. */
    pending,
    /** Hiển thị trên feed. */
    active,
    /** Phân tích thất bại (dự phòng). */
    failed,
    /** Bị từ chối/ẩn bởi kiểm duyệt. */
    banned
}
