package com.peekle.global.config;

import com.peekle.global.storage.R2StorageService;
import org.mockito.Mockito;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

@Configuration
@Profile("test")
public class TestR2Config {

    @Bean
    public R2StorageService r2StorageService() {
        return Mockito.mock(R2StorageService.class);
    }
}
