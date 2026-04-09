package com.example.video.model;

import java.io.Serializable;
import java.util.UUID;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class VideoTagId implements Serializable {
    private UUID videoId;
    private UUID tagId;
}
