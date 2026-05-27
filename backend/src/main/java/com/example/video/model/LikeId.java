package com.example.video.model;

import java.io.Serializable;
import java.util.UUID;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

/**
 * Khóa chính composite cho entity {@link Like}.
 * Dùng làm {@code @IdClass} để JPA nhận diện khóa compound {@code (userId, videoId)}.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class LikeId implements Serializable {
    private UUID userId;
    private UUID videoId;
}
