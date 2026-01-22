package com.peekle.global.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable) // CSRF 비활성화 (테스트용)
                .cors(cors -> cors.configurationSource(corsConfigurationSource())) // CORS 설정 적용
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/submissions/**").permitAll() // 제출 API 허용
                        .requestMatchers("/api/problems/sync").permitAll() // 문제 동기화 (내부 Key 검증)
                        .requestMatchers("/h2-console/**").permitAll() // H2 Console 허용
                        .requestMatchers("/api/studies/**").permitAll() // [TEST] 스터디 API 허용
                        .requestMatchers("/ws-stomp/**").permitAll() // WebSocket 연결 허용
                        .anyRequest().authenticated() // 그 외는 인증 필요
                )
                .headers(headers -> headers.frameOptions(frame -> frame.disable())); // H2 Console iframe 허용

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        // 확장프로그램 Origin 허용
        // "chrome-extension://<ID>" 형식인데, 개발 중임으로 모든 Origin 일시 허용하거나 구체적으로 설정 가능
        configuration.setAllowedOriginPatterns(List.of("*"));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
