package com.example.video.dto;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class ModerationQueueResponse {
    private UUID queueId;
    private UUID videoId;
    private String videoTitle;
    private String videoUrl;
    private String videoThumbnail;
    private String uploaderUsername;
    private String priority;
    private String status;
    private String assignedTo;
    private String aiJobStatus;
    private Integer sceneCount;
    private LocalDateTime createdAt;
}
