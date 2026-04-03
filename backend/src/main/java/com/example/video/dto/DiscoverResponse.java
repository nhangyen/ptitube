package com.example.video.dto;

import lombok.Data;

import java.util.List;

@Data
public class DiscoverResponse {
    private List<VideoFeedItem> featuredVideos;
    private List<HashtagResponse> trendingHashtags;
    private List<UserCardResponse> suggestedCreators;
}
