package com.peekle.global.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.client.RestClient;

@Configuration
public class AiConfig {
    
    @Value("${AI_SERVER_URL:http://ai-server:8000}")
    private String aiServerUrl;
    
    @Bean
    public RestClient aiRestClient(RestClient.Builder builder) {
        // HTTP/2 Upgrade 요청을 방지하기 위해 HTTP/1.1을 강제로 설정
        java.net.http.HttpClient httpClient = java.net.http.HttpClient.newBuilder()
            .version(java.net.http.HttpClient.Version.HTTP_1_1)
            .build();

        return builder
                .baseUrl(aiServerUrl)
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .requestFactory(new org.springframework.http.client.JdkClientHttpRequestFactory(httpClient))
                .build();
    }
}