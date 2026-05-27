package com.example.video.dto;

import lombok.Data;

import java.util.List;

/**
 * Response cho trang Hashtag Detail — hiển thị thông tin hashtag và danh sách video có gắn hashtag đó.
 */
@Data
public class HashtagDetailResponse {
    /** Thông tin hashtag (tên, số video). */
    private HashtagResponse hashtag;
    /** Danh sách video active có gắn hashtag, sắp xếp mới nhất trước (có phân trang). */
    private List<VideoFeedItem> videos;
}
