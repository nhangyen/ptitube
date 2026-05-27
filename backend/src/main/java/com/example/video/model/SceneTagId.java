package com.example.video.model;

import java.io.Serializable;
import java.util.UUID;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

/**
 * Composite primary key cho entity {@link SceneTag}.
 *
 * <p>Tách lớp riêng vì JPA yêu cầu key compound phải là một class implements
 * {@link Serializable} với cấu trúc trùng với các trường được đánh dấu {@code @Id}
 * trong entity.</p>
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SceneTagId implements Serializable {
    private UUID sceneId;
    private UUID tagId;
}
