package com.example.video.dto;

import lombok.Data;

import java.util.List;

@Data
public class SearchResponse {
    private String query;
    private List<VideoFeedItem> videos;
    private List<UserCardResponse> users;
    private List<HashtagResponse> hashtags;
}
