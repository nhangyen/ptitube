package com.example.video.dto;

import lombok.Data;

/**
 * Response tóm tắt cho một hashtag, dùng trong trang Discover và kết quả tìm kiếm.
 * {@code name} là tên lowercase duy nhất (slug); {@code displayName} là tên hiển thị có dấu.
 */
@Data
public class HashtagResponse {
    /** Tên hashtag dạng lowercase slug (dùng để filter và link). */
    private String name;
    /** Tên hiển thị đầy đủ (thường giống {@code name} với dấu hashtag "#"). */
    private String displayName;
    /** Số video active đang gắn hashtag này. */
    private long videoCount;
}
