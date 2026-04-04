package com.example.video.dto;

import lombok.Data;

@Data
public class HashtagResponse {
    private String name;
    private String displayName;
    private long videoCount;
}
