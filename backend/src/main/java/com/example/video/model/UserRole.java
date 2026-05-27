package com.example.video.model;

/**
 * Enum vai trò người dùng trong hệ thống.
 * <ul>
 *   <li>{@code user} — Người dùng thông thường, không có quyền kiểm duyệt.</li>
 *   <li>{@code moderator} — Có thể xem và xử lý hàng chờ kiểm duyệt.</li>
 *   <li>{@code admin} — Toàn quyền: kiểm duyệt + quản trị báo cáo + ban user.</li>
 * </ul>
 */
public enum UserRole {
    /** Người dùng thông thường. */
    user,
    /** Kiểm duyệt viên — quyền truy cập hàng chờ moderation. */
    moderator,
    /** Quản trị viên — toàn quyền hệ thống. */
    admin
}
