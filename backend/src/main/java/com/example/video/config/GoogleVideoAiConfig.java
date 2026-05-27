package com.example.video.config;

import com.google.cloud.videointelligence.v1.VideoIntelligenceServiceClient;
import com.google.cloud.videointelligence.v1.VideoIntelligenceServiceSettings;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.IOException;

/**
 * Cấu hình Google Cloud Video Intelligence API client.
 *
 * <p>Bean {@link VideoIntelligenceServiceClient} chỉ được khởi tạo khi property
 * {@code video-ai.enabled=true} trong {@code application.yml}.
 * Khi {@code enabled=false} (mặc định), bean trả về {@code null} và
 * {@link com.example.video.service.AiAnalysisService} tự động chuyển sang chế độ mock
 * (sinh cảnh và tag giả lập mà không gọi API thật).
 *
 * <p>Để bật AI thực cần đặt biến môi trường {@code GOOGLE_APPLICATION_CREDENTIALS}
 * trỏ đến file JSON key của Service Account có quyền "Video Intelligence API User".
 */
@Configuration
public class GoogleVideoAiConfig {

    @Value("${video-ai.enabled:false}")
    private boolean enabled;

    /**
     * Tạo client gRPC kết nối đến Google Video Intelligence API.
     *
     * @return VideoIntelligenceServiceClient nếu AI được bật, {@code null} nếu tắt
     * @throws IOException nếu không thể đọc credential từ {@code GOOGLE_APPLICATION_CREDENTIALS}
     */
    @Bean
    public VideoIntelligenceServiceClient videoIntelligenceServiceClient() throws IOException {
        if (!enabled) {
            return null;
        }
        return VideoIntelligenceServiceClient.create(
                VideoIntelligenceServiceSettings.newBuilder().build()
        );
    }
}
