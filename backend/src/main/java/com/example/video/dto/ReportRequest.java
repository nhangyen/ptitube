package com.example.video.dto;

import lombok.Data;
import java.util.UUID;

@Data
public class ReportRequest {
    private UUID videoId;
    private String reason;
}
