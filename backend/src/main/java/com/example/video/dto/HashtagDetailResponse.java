package com.example.video.dto;

import lombok.Data;

import java.util.List;

@Data
public class HashtagDetailResponse {
    private HashtagResponse hashtag;
    private List<VideoFeedItem> videos;
}
