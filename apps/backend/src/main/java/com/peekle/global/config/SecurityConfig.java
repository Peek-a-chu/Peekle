package com.peekle.global.config;

import com.peekle.global.auth.handler.OAuth2FailureHandler;
import com.peekle.global.auth.handler.OAuth2SuccessHandler;
import com.peekle.global.auth.jwt.JwtAuthenticationFilter;
import com.peekle.global.auth.filter.ExtensionAuthenticationFilter;
import com.peekle.global.auth.repository.HttpCookieOAuth2AuthorizationRequestRepository;
import com.peekle.global.auth.service.CustomOAuth2UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.client.endpoint.OAuth2AccessTokenResponseClient;
import org.springframework.security.oauth2.client.endpoint.OAuth2AuthorizationCodeGrantRequest;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.http.HttpStatus;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {
        private final CustomOAuth2UserService customOAuth2UserService;
        private final OAuth2SuccessHandler oAuth2SuccessHandler;
        private final OAuth2FailureHandler oAuth2FailureHandler;
        private final JwtAuthenticationFilter jwtAuthenticationFilter;
        private final ExtensionAuthenticationFilter extensionAuthenticationFilter;
        private final HttpCookieOAuth2AuthorizationRequestRepository cookieAuthorizationRequestRepository;
        private final OAuth2AccessTokenResponseClient<OAuth2AuthorizationCodeGrantRequest> accessTokenResponseClient;

        @Value("${app.frontend-url}")
        private String frontendUrl;

        @Bean
        public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
                http
                                .csrf(AbstractHttpConfigurer::disable)
                                .sessionManagement(session -> session
                                                .sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                                .authorizeHttpRequests(auth -> auth
                                                // Auth / OAuth2
                                                .requestMatchers("/api/auth/**").permitAll()
                                                .requestMatchers("/api/users/check-nickname").permitAll()
                                                .requestMatchers("/api/users/check-boj-id").permitAll()
                                                .requestMatchers("/oauth2/**", "/login/oauth2/**").permitAll()

                                                // Extension / APIs
                                                .requestMatchers("/api/submissions/**").permitAll()
                                                .requestMatchers("/api/problems/**").permitAll() // 문제 검색/동기화
                                                .requestMatchers("/api/users/me/**").permitAll() // Extension token
                                                .requestMatchers(org.springframework.http.HttpMethod.GET,
                                                                "/api/users/*/profile")
                                                .permitAll() // 남의 프로필 조회
                                                .requestMatchers(org.springframework.http.HttpMethod.GET,
                                                                "/api/users/*/history")
                                                .permitAll() // 남의 히스토리 조회
                                                .requestMatchers(org.springframework.http.HttpMethod.GET,
                                                                "/api/users/*/streak")
                                                .permitAll() // 남의 스트릭 조회
                                                .requestMatchers(org.springframework.http.HttpMethod.GET,
                                                                "/api/users/*/timeline")
                                                .permitAll() // 남의 타임라인 조회
                                                // endpoints

                                                // Dev / Test
                                                .requestMatchers("/api/studies/**").permitAll() // [TEST] 스터디 API
                                                .requestMatchers("/api/games/**").permitAll() // [TEST] 게임 API
                                                .requestMatchers("/api/workbooks/**").permitAll() // [TEST] 문제집 API
                                                .requestMatchers("/api/dev/users/**").permitAll()
                                                .requestMatchers("/api/ranks/**").permitAll()

                                                // WebSocket
                                                .requestMatchers("/ws-stomp/**").permitAll()

                                                // Tools
                                                .requestMatchers("/h2-console/**").permitAll()
                                                .requestMatchers("/v3/api-docs/**", "/swagger-ui/**",
                                                                "/swagger-ui.html")
                                                .permitAll()
                                                .requestMatchers("/springwolf/**").permitAll()

                                                // Default
                                                .anyRequest().authenticated())
                                .oauth2Login(oauth2 -> oauth2
                                                .authorizationEndpoint(auth -> auth
                                                                .authorizationRequestRepository(
                                                                                cookieAuthorizationRequestRepository))
                                                .tokenEndpoint(token -> token
                                                                .accessTokenResponseClient(accessTokenResponseClient))
                                                .userInfoEndpoint(userInfo -> userInfo
                                                                .userService(customOAuth2UserService))
                                                .successHandler(oAuth2SuccessHandler)
                                                .failureHandler(oAuth2FailureHandler))
                                .addFilterBefore(extensionAuthenticationFilter,
                                                UsernamePasswordAuthenticationFilter.class)
                                .exceptionHandling(exception -> exception
                                                .authenticationEntryPoint(
                                                                new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
                                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
                                .headers(headers -> headers.frameOptions(frame -> frame.disable())); // H2 Console
                                                                                                     // iframe 허용

                return http.build();
        }

        @Bean
        public CorsConfigurationSource corsConfigurationSource() {
                CorsConfiguration configuration = new CorsConfiguration();

                configuration.setAllowedOriginPatterns(List.of(frontendUrl, "chrome-extension://*", "*"));
                configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
                configuration.setAllowedHeaders(List.of("*"));
                configuration.setAllowCredentials(true);

                UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
                source.registerCorsConfiguration("/**", configuration);
                return source;
        }
}
