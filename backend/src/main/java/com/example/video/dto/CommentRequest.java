package com.example.video.dto;

import lombok.Data;
import java.util.UUID;

@Data
public class CommentRequest {
    private UUID videoId;
    private UUID parentId; // null for top-level comment
    private String content;
}
