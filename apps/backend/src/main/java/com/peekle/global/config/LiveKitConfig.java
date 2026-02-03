package com.peekle.global.config;

import io.livekit.server.RoomServiceClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class LiveKitConfig {

    @Value("${livekit.url}")
    private String url;
    @Value("${livekit.api-key}")
    private String apiKey;
    @Value("${livekit.api-secret}")
    private String secret;

    @Bean
    public RoomServiceClient roomServiceClient() {
        // RoomServiceClient requires http/https scheme, but we might have ws/wss in
        // config
        String apiUrl = url;
        if (apiUrl.startsWith("ws://")) {
            apiUrl = apiUrl.replace("ws://", "http://");
        } else if (apiUrl.startsWith("wss://")) {
            apiUrl = apiUrl.replace("wss://", "https://");
        }
        return RoomServiceClient.create(apiUrl, apiKey, secret);
    }
}
