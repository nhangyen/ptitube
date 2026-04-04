package com.example.video.dto;

import lombok.Data;

import java.util.List;
import java.util.UUID;

@Data
public class ModerationActionRequest {
    private String reason;
    private UUID targetSceneId;
    private List<UUID> tagsToAdd;
    private List<UUID> tagsToRemove;
}
