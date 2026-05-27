package com.example.video.dto;

import lombok.Data;

import java.util.List;

/**
 * Response cho trang Discover, bao gồm 3 phần:
 * <ul>
 *   <li>{@code featuredVideos} — top 8 video nổi bật (scoring algorithm).</li>
 *   <li>{@code trendingHashtags} — top 8 hashtag nhiều video active nhất.</li>
 *   <li>{@code suggestedCreators} — top creator được xếp hạng theo followers×3 + videos.</li>
 * </ul>
 */
@Data
public class DiscoverResponse {
    private List<VideoFeedItem> featuredVideos;
    private List<HashtagResponse> trendingHashtags;
    private List<UserCardResponse> suggestedCreators;
}
