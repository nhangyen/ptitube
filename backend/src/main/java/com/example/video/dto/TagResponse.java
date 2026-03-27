package com.example.video.dto;

import lombok.Data;

import java.util.UUID;

@Data
public class TagResponse {
    private UUID id;
    private String name;
    private String category;
    private String source;
    private Double confidence;
}
