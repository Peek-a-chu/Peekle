package com.peekle.global.config;

import org.mockito.Mockito;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Profile;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

@TestConfiguration
@Profile("test")
public class TestR2Config {

    @Bean
    public S3Presigner s3Presigner() {
        return Mockito.mock(S3Presigner.class);
    }

    @Bean
    public S3Client s3Client() {
        return Mockito.mock(S3Client.class);
    }
}
