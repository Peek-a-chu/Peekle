package com.peekle.global.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

@Configuration
public class AiConfig {
    
    @Value("${ai.server.url:http://ai-server:8000}")
    private String aiServerUrl;
    
    @Bean
    public RestClient aiRestClient() {
        return RestClient.builder()
                .baseUrl(aiServerUrl)
                .build();
    }
}
