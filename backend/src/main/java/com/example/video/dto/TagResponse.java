package com.example.video.dto;

import lombok.Data;

import java.util.UUID;

/**
 * Response cho một tag gắn với video.
 * {@code source} cho biết nguồn gốc: {@code uploader} (do creator chọn), {@code ai} (AI phát hiện),
 * hoặc {@code admin} (moderator gán thủ công). {@code confidence} là độ tin cậy của AI (null nếu không phải AI).
 */
@Data
public class TagResponse {
    private UUID id;
    private String name;
    private String category;
    /** Nguồn gốc tag: {@code uploader}, {@code ai}, hoặc {@code admin}. */
    private String source;
    /** Độ tin cậy của AI khi phát hiện tag (0.0–1.0); null nếu source != ai. */
    private Double confidence;
}
