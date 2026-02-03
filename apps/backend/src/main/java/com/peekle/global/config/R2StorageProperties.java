package com.peekle.global.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Cloudflare R2 스토리지 설정 Properties
 */
@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "r2")
public class R2StorageProperties {

    /**
     * R2 계정 ID
     */
    private String accountId;

    /**
     * R2 액세스 키 ID
     */
    private String accessKeyId;

    /**
     * R2 비밀 액세스 키
     */
    private String secretAccessKey;

    /**
     * R2 버킷 이름
     */
    private String bucketName;

    /**
     * R2 공개 URL (선택사항)
     */
    private String publicUrl;

    /**
     * R2 엔드포인트 URL 자동 생성
     * 
     * @return https://{accountId}.r2.cloudflarestorage.com
     */
    public String getEndpoint() {
        return "https://" + accountId + ".r2.cloudflarestorage.com";
    }
}
