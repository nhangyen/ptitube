package com.example.video.service;

import io.minio.BucketExistsArgs;
import io.minio.GetObjectArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.StatObjectArgs;
import io.minio.StatObjectResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;

/**
 * Service lưu trữ file video trên MinIO (S3-compatible object storage).
 *
 * <p>Bucket được tạo tự động khi chưa tồn tại, sử dụng double-checked locking
 * ({@code synchronized + volatile bucketReady}) để đảm bảo an toàn trong môi trường đa luồng
 * mà không tốn chi phí đồng bộ sau lần khởi tạo đầu tiên.
 *
 * <p>Các thao tác chính:
 * <ul>
 *   <li>{@link #uploadFile} — Upload file multipart lên MinIO.</li>
 *   <li>{@link #getFile(String, long, long)} — Lấy InputStream với hỗ trợ partial read (HTTP Range).</li>
 *   <li>{@link #statObject} — Lấy metadata (size, content-type) của object.</li>
 * </ul>
 */
@Service
public class MinioService {

    @Autowired
    private MinioClient minioClient;

    @Value("${minio.bucket-name}")
    private String bucketName;

    private final Object bucketLock = new Object();
    private volatile boolean bucketReady;

    /**
     * Upload file multipart lên MinIO bucket với tên object và content-type tương ứng.
     *
     * @param objectName tên object trong MinIO (UUID + extension)
     * @param file       file multipart cần upload
     * @throws RuntimeException nếu upload thất bại
     */
    public void uploadFile(String objectName, MultipartFile file) {
        try {
            ensureBucketExists();
            minioClient.putObject(
                    PutObjectArgs.builder()
                            .bucket(bucketName)
                            .object(objectName)
                            .stream(file.getInputStream(), file.getSize(), -1)
                            .contentType(file.getContentType())
                            .build());
        } catch (Exception e) {
            throw new RuntimeException("Error uploading file to MinIO", e);
        }
    }

    /**
     * Lấy toàn bộ nội dung file từ MinIO dưới dạng InputStream.
     *
     * @param objectName tên object trong MinIO
     * @return InputStream của toàn bộ file
     */
    public InputStream getFile(String objectName) {
        return getFile(objectName, 0, -1);
    }

    /**
     * Lấy một phần nội dung file từ MinIO (hỗ trợ HTTP Range Request).
     *
     * @param objectName tên object trong MinIO
     * @param offset     byte bắt đầu đọc (0 = từ đầu)
     * @param length     số byte cần đọc (≤ 0 = đọc đến cuối)
     * @return InputStream của phần được yêu cầu
     * @throws RuntimeException nếu không tìm thấy object hoặc lỗi kết nối
     */
    public InputStream getFile(String objectName, long offset, long length) {
        try {
            ensureBucketExists();
            GetObjectArgs.Builder builder = GetObjectArgs.builder()
                    .bucket(bucketName)
                    .object(objectName)
                    .offset(Math.max(offset, 0));
            if (length > 0) {
                builder.length(length);
            }
            return minioClient.getObject(builder.build());
        } catch (Exception e) {
            throw new RuntimeException("Error fetching file from MinIO", e);
        }
    }

    /**
     * Lấy metadata của object trong MinIO (kích thước byte, content-type, tên object).
     *
     * @param objectName tên object trong MinIO
     * @return StoredObjectInfo với size, contentType và objectName
     * @throws RuntimeException nếu object không tồn tại hoặc lỗi kết nối
     */
    public StoredObjectInfo statObject(String objectName) {
        try {
            ensureBucketExists();
            StatObjectResponse response = minioClient.statObject(
                    StatObjectArgs.builder()
                            .bucket(bucketName)
                            .object(objectName)
                            .build());
            return new StoredObjectInfo(
                    response.size(),
                    response.contentType(),
                    response.object());
        } catch (Exception e) {
            throw new RuntimeException("Error fetching file metadata from MinIO", e);
        }
    }

    /**
     * Đảm bảo bucket MinIO tồn tại. Dùng double-checked locking để tạo bucket
     * đúng một lần trong môi trường đa luồng mà không cần synchronize mỗi lần gọi.
     */
    private void ensureBucketExists() throws Exception {
        if (bucketReady) {
            return;
        }

        synchronized (bucketLock) {
            if (bucketReady) {
                return;
            }

            boolean found = minioClient.bucketExists(BucketExistsArgs.builder().bucket(bucketName).build());
            if (!found) {
                minioClient.makeBucket(MakeBucketArgs.builder().bucket(bucketName).build());
            }
            bucketReady = true;
        }
    }

    public record StoredObjectInfo(long size, String contentType, String objectName) {
    }
}
