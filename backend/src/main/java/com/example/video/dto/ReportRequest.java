package com.example.video.dto;

import lombok.Data;
import java.util.UUID;

/**
 * DTO request khi người dùng gửi báo cáo vi phạm cho một video.
 *
 * <p>Endpoint nhận: {@code POST /api/videos/&#123;videoId&#125;/report}.</p>
 */
@Data
public class ReportRequest {
    /** UUID video bị báo cáo. */
    private UUID videoId;

    /** Lý do báo cáo do người dùng nhập (free text, bắt buộc). */
    private String reason;
}
