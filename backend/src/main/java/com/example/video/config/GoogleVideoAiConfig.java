package com.example.video.config;

import com.google.cloud.videointelligence.v1.VideoIntelligenceServiceClient;
import com.google.cloud.videointelligence.v1.VideoIntelligenceServiceSettings;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.IOException;

@Configuration
public class GoogleVideoAiConfig {

    @Value("${video-ai.enabled:false}")
    private boolean enabled;

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
