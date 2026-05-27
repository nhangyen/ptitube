package com.example.video.model;

import java.io.Serializable;
import java.util.UUID;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

/**
 * Khóa chính composite cho entity {@link VideoTag}.
 * Dùng làm {@code @IdClass} để JPA nhận diện khóa compound {@code (videoId, tagId)}.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class VideoTagId implements Serializable {
    private UUID videoId;
    private UUID tagId;
}
