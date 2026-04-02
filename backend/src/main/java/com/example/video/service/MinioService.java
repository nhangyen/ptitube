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

@Service
public class MinioService {

    @Autowired
    private MinioClient minioClient;

    @Value("${minio.bucket-name}")
    private String bucketName;

    private final Object bucketLock = new Object();
    private volatile boolean bucketReady;

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

    public InputStream getFile(String objectName) {
        return getFile(objectName, 0, -1);
    }

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
