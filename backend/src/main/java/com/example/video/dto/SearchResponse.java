package com.example.video.dto;

import lombok.Data;

import java.util.List;

/**
 * Response cho tính năng tìm kiếm đa thực thể.
 * Trả về cùng lúc: video khớp full-text search, user có username gần đúng,
 * và hashtag có tên gần đúng — client chọn tab để hiển thị từng loại.
 */
@Data
public class SearchResponse {
    /** Query gốc được gửi lên từ client. */
    private String query;
    /** Danh sách video tìm được (full-text search hoặc ILIKE fallback). */
    private List<VideoFeedItem> videos;
    /** Danh sách user có username khớp (tối đa 10). */
    private List<UserCardResponse> users;
    /** Danh sách hashtag có tên khớp. */
    private List<HashtagResponse> hashtags;
}
