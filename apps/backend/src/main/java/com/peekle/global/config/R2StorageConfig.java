package com.peekle.global.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

import java.net.URI;

/**
 * Cloudflare R2 스토리지 설정
 * R2는 S3 호환 API를 제공하므로 AWS S3 SDK를 사용
 */
@Configuration
@RequiredArgsConstructor
public class R2StorageConfig {

    private final R2StorageProperties r2Properties;

    /**
     * R2 S3 클라이언트 Bean 생성
     * 
     * @return S3Client
     */
    @Bean
    public S3Client r2S3Client() {
        AwsBasicCredentials credentials = AwsBasicCredentials.create(
                r2Properties.getAccessKeyId(),
                r2Properties.getSecretAccessKey());

        return S3Client.builder()
                .endpointOverride(URI.create(r2Properties.getEndpoint()))
                .credentialsProvider(StaticCredentialsProvider.create(credentials))
                .region(Region.of("auto")) // R2는 자동으로 리전 설정
                .build();
    }

    /**
     * R2 S3 Presigner Bean 생성 (Presigned URL 생성용)
     * 
     * @return S3Presigner
     */
    @Bean
    public S3Presigner r2S3Presigner() {
        AwsBasicCredentials credentials = AwsBasicCredentials.create(
                r2Properties.getAccessKeyId(),
                r2Properties.getSecretAccessKey());

        return S3Presigner.builder()
                .endpointOverride(URI.create(r2Properties.getEndpoint()))
                .credentialsProvider(StaticCredentialsProvider.create(credentials))
                .region(Region.of("auto"))
                .build();
    }
}
