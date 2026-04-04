package com.example.video.dto;

import lombok.Data;

import java.util.List;
import java.util.UUID;

@Data
public class SceneDetailResponse {
    private UUID sceneId;
    private Integer sceneIndex;
    private Double startTime;
    private Double endTime;
    private String thumbnailUrl;
    private String aiSummary;
    private String status;
    private List<TagResponse> tags;
}
