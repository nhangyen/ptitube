package com.example.video.config;

import io.minio.MinioClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Cấu hình MinIO client cho lưu trữ đối tượng (object storage).
 *
 * <p>MinIO là giải pháp lưu trữ tương thích AWS S3 được self-host.
 * Các thông số kết nối (URL, access key, secret key) được đọc từ {@code application.yml}
 * thông qua các property {@code minio.url}, {@code minio.access-key}, {@code minio.secret-key}.
 *
 * <p>Bean {@link MinioClient} được inject vào {@link com.example.video.service.MinioService}
 * để thực hiện các thao tác upload, download và stat file video.
 */
@Configuration
public class MinioConfig {

    @Value("${minio.url}")
    private String url;

    @Value("${minio.access-key}")
    private String accessKey;

    @Value("${minio.secret-key}")
    private String secretKey;

    /**
     * Tạo MinioClient dùng chung cho toàn ứng dụng với thông tin kết nối từ cấu hình.
     *
     * @return MinioClient đã được khởi tạo, sẵn sàng dùng trong MinioService
     */
    @Bean
    public MinioClient minioClient() {
        return MinioClient.builder()
                .endpoint(url)
                .credentials(accessKey, secretKey)
                .build();
    }
}
