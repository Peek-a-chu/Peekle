package com.peekle.global.storage;

import com.peekle.global.config.R2StorageProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;

import java.time.Duration;

import org.springframework.context.annotation.Profile;

@Service
@Profile("!test")
@RequiredArgsConstructor
public class R2StorageService {

    private final S3Presigner s3Presigner;
    private final S3Client s3Client;
    private final R2StorageProperties r2Properties;

    /**
     * Presigned URL 생성 (업로드용)
     *
     * @param objectKey   S3 저장 경로 (파일명 포함)
     * @param contentType 파일 타입 (예: image/jpeg)
     * @return Presigned URL
     */
    public String generatePresignedUrl(String objectKey, String contentType) {
        PutObjectRequest objectRequest = PutObjectRequest.builder()
                .bucket(r2Properties.getBucketName())
                .key(objectKey)
                .contentType(contentType)
                .build();

        PutObjectPresignRequest presignRequest = PutObjectPresignRequest.builder()
                .signatureDuration(Duration.ofMinutes(10)) // 유효시간 10분
                .putObjectRequest(objectRequest)
                .build();

        PresignedPutObjectRequest presignedRequest = s3Presigner.presignPutObject(presignRequest);
        return presignedRequest.url().toString();
    }

    /**
     * 파일 삭제
     *
     * @param fileUrl 파일 전체 URL (예: https://pub-xxx.r2.dev/profile/1/test.jpg)
     */
    public void deleteFile(String fileUrl) {
        if (fileUrl == null || fileUrl.isEmpty()) {
            return;
        }

        try {
            // URL에서 Object Key 추출 logic
            // 예: https://pub-xxx.r2.dev/KEY -> KEY 추출
            // 단순히 뒤에서부터 찾는 방식 등 상황에 맞게 구현.
            // 여기서는 publicUrl이 설정되어 있다고 가정하고 제거하거나,
            // 단순히 마지막 '/' 이후가 아니라 전체 path를 key로 쓰는지 확인 필요.
            // R2StorageConfig/Properties 확인 결과 publicUrl이 있음.

            String objectKey = fileUrl;
            if (r2Properties.getPublicUrl() != null && !r2Properties.getPublicUrl().isEmpty()) {
                String publicUrl = r2Properties.getPublicUrl();
                // Ensure publicUrl doesn't end with / for consistent replacement
                if (publicUrl.endsWith("/")) {
                    publicUrl = publicUrl.substring(0, publicUrl.length() - 1);
                }

                if (fileUrl.startsWith(publicUrl)) {
                    objectKey = fileUrl.substring(publicUrl.length());
                }
            }

            // Remove leading slash if present (S3 keys usually don't start with /)
            if (objectKey.startsWith("/")) {
                objectKey = objectKey.substring(1);
            }

            DeleteObjectRequest deleteObjectRequest = DeleteObjectRequest.builder()
                    .bucket(r2Properties.getBucketName())
                    .key(objectKey)
                    .build();

            s3Client.deleteObject(deleteObjectRequest);
        } catch (Exception e) {
            // 삭제 실패 시 로깅하거나 무시 (비즈니스 로직에 영향 없도록)
            // System.err.println("File delete failed: " + e.getMessage());
        }
    }

    /**
     * Public URL 생성
     * 
     * @param objectKey S3 Object Key
     * @return Public URL (e.g. https://pub-xxx.r2.dev/profile/1/test.jpg)
     */
    public String getPublicUrl(String objectKey) {
        if (r2Properties.getPublicUrl() != null && !r2Properties.getPublicUrl().isEmpty()) {
            String baseUrl = r2Properties.getPublicUrl();
            if (baseUrl.endsWith("/")) {
                baseUrl = baseUrl.substring(0, baseUrl.length() - 1);
            }
            return baseUrl + "/" + objectKey;
        }
        // Fallback or empty if not configured (Client might not be able to access)
        return "/" + objectKey;
    }
}
