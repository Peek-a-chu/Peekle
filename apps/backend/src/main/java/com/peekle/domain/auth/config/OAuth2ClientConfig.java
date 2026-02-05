package com.peekle.domain.auth.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpRequest;
import org.springframework.http.MediaType;
import org.springframework.http.client.ClientHttpRequestExecution;
import org.springframework.http.client.ClientHttpRequestInterceptor;
import org.springframework.http.client.ClientHttpResponse;
import org.springframework.http.client.BufferingClientHttpRequestFactory;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.http.converter.FormHttpMessageConverter;
import org.springframework.security.oauth2.client.endpoint.DefaultAuthorizationCodeTokenResponseClient;
import org.springframework.security.oauth2.client.endpoint.OAuth2AccessTokenResponseClient;
import org.springframework.security.oauth2.client.endpoint.OAuth2AuthorizationCodeGrantRequest;
import org.springframework.security.oauth2.client.http.OAuth2ErrorResponseErrorHandler;
import org.springframework.security.oauth2.core.http.converter.OAuth2AccessTokenResponseHttpMessageConverter;
import org.springframework.util.StreamUtils;
import org.springframework.web.client.RestTemplate;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;

@Slf4j
@Configuration
public class OAuth2ClientConfig {

    @Bean
    public OAuth2AccessTokenResponseClient<OAuth2AuthorizationCodeGrantRequest> accessTokenResponseClient() {
        DefaultAuthorizationCodeTokenResponseClient client = new DefaultAuthorizationCodeTokenResponseClient();

        OAuth2AccessTokenResponseHttpMessageConverter tokenResponseConverter =
                new OAuth2AccessTokenResponseHttpMessageConverter();
        // 카카오가 반환하는 Content-Type (application/json;charset=UTF-8) 지원
        tokenResponseConverter.setSupportedMediaTypes(Arrays.asList(
                MediaType.APPLICATION_JSON,
                new MediaType("application", "json", StandardCharsets.UTF_8),
                new MediaType("application", "*+json")
        ));

        RestTemplate restTemplate = new RestTemplate(Arrays.asList(
                new FormHttpMessageConverter(),
                tokenResponseConverter
        ));

        // 요청/응답 로깅을 위한 버퍼링 설정
        restTemplate.setRequestFactory(new BufferingClientHttpRequestFactory(new SimpleClientHttpRequestFactory()));
        restTemplate.getInterceptors().add(new LoggingInterceptor());
        restTemplate.setErrorHandler(new OAuth2ErrorResponseErrorHandler());

        client.setRestOperations(restTemplate);
        return client;
    }

    // 토큰 요청/응답 로깅 인터셉터
    private static class LoggingInterceptor implements ClientHttpRequestInterceptor {
        private static final org.slf4j.Logger logger = org.slf4j.LoggerFactory.getLogger(LoggingInterceptor.class);

        @Override
        public ClientHttpResponse intercept(HttpRequest request, byte[] body,
                                             ClientHttpRequestExecution execution) throws IOException {
            logger.info("===== OAuth2 Token Request =====");
            logger.info("URI: {}", request.getURI());
            logger.info("Method: {}", request.getMethod());
            logger.info("Headers: {}", request.getHeaders());
            logger.info("Body: {}", new String(body, StandardCharsets.UTF_8));

            ClientHttpResponse response = execution.execute(request, body);

            logger.info("===== OAuth2 Token Response =====");
            logger.info("Status: {}", response.getStatusCode());
            logger.info("Headers: {}", response.getHeaders());
            String responseBody = StreamUtils.copyToString(response.getBody(), StandardCharsets.UTF_8);
            logger.info("Body: {}", responseBody);

            return response;
        }
    }
}
