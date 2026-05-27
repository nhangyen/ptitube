package com.example.video.model;

import java.io.Serializable;
import java.util.UUID;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

/**
 * Khóa chính composite cho entity {@link Follow}.
 * Dùng làm {@code @IdClass} để JPA nhận diện khóa compound {@code (followerId, followingId)}.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class FollowId implements Serializable {
    private UUID followerId;
    private UUID followingId;
}
