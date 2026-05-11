package com.peekle.domain.leetcode.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.peekle.global.exception.BusinessException;
import com.peekle.global.exception.ErrorCode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
public class GeminiTranslationService {

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final String apiKey;
    private final String model;
    private final int maxBatchSize;
    private final int maxTextLength;
    private final int maxTotalLength;

    public GeminiTranslationService(
            RestClient.Builder restClientBuilder,
            ObjectMapper objectMapper,
            @Value("${gemini.api-key:}") String apiKey,
            @Value("${gemini.model:gemini-2.5-flash-lite}") String model,
            @Value("${leetcode.translation.max-batch-size:20}") int maxBatchSize,
            @Value("${leetcode.translation.max-text-length:2000}") int maxTextLength,
            @Value("${leetcode.translation.max-total-length:12000}") int maxTotalLength
    ) {
        this.restClient = restClientBuilder.baseUrl("https://generativelanguage.googleapis.com").build();
        this.objectMapper = objectMapper;
        this.apiKey = apiKey;
        this.model = model;
        this.maxBatchSize = maxBatchSize;
        this.maxTextLength = maxTextLength;
        this.maxTotalLength = maxTotalLength;
    }

    public List<String> translate(List<String> texts) {
        validateRequest(texts);

        if (!StringUtils.hasText(apiKey)) {
            throw new BusinessException(ErrorCode.TRANSLATION_API_KEY_MISSING);
        }

        try {
            JsonNode response = restClient.post()
                    .uri(uriBuilder -> uriBuilder
                            .path("/v1beta/models/{model}:generateContent")
                            .queryParam("key", apiKey)
                            .build(model))
                    .body(createRequestBody(texts))
                    .retrieve()
                    .body(JsonNode.class);

            return parseTranslations(response, texts.size());
        } catch (RestClientResponseException e) {
            log.warn("Gemini 번역 API 오류 - status: {}, body: {}",
                    e.getStatusCode(), abbreviate(e.getResponseBodyAsString()));
            throw new BusinessException(ErrorCode.TRANSLATION_PROVIDER_ERROR);
        } catch (RestClientException e) {
            log.warn("Gemini 번역 API 호출 실패", e);
            throw new BusinessException(ErrorCode.TRANSLATION_PROVIDER_ERROR);
        } catch (JsonProcessingException e) {
            log.warn("Gemini 번역 응답 파싱 실패", e);
            throw new BusinessException(ErrorCode.TRANSLATION_INVALID_RESPONSE);
        }
    }

    public void validateRequest(List<String> texts) {
        if (texts == null || texts.isEmpty() || texts.size() > maxBatchSize) {
            throw new BusinessException(
                    ErrorCode.TRANSLATION_REQUEST_TOO_LARGE,
                    "한 번에 번역할 수 있는 문장은 최대 %d개입니다.".formatted(maxBatchSize)
            );
        }

        int totalLength = 0;
        for (String text : texts) {
            if (!StringUtils.hasText(text)) {
                throw new BusinessException(ErrorCode.TRANSLATION_REQUEST_TOO_LARGE, "번역할 텍스트는 비어 있을 수 없습니다.");
            }
            if (text.length() > maxTextLength) {
                throw new BusinessException(
                        ErrorCode.TRANSLATION_REQUEST_TOO_LARGE,
                        "번역 텍스트는 문장당 최대 %d자까지 가능합니다.".formatted(maxTextLength)
                );
            }
            totalLength += text.length();
        }

        if (totalLength > maxTotalLength) {
            throw new BusinessException(
                    ErrorCode.TRANSLATION_REQUEST_TOO_LARGE,
                    "번역 요청은 전체 %d자까지 가능합니다.".formatted(maxTotalLength)
            );
        }
    }

    private Map<String, Object> createRequestBody(List<String> texts) throws JsonProcessingException {
        return Map.of(
                "contents", List.of(Map.of(
                        "role", "user",
                        "parts", List.of(Map.of("text", createPrompt(texts)))
                )),
                "generationConfig", Map.of(
                        "temperature", 0.1,
                        "responseMimeType", "application/json"
                )
        );
    }

    private String createPrompt(List<String> texts) throws JsonProcessingException {
        return """
                You translate LeetCode problem statement or solution analysis fragments from English to Korean.
                Return only a valid JSON object in this exact shape: {"translations":["..."]}.

                Rules:
                - Keep the number and order of translations exactly the same as the input array.
                - Preserve placeholder markers exactly as-is, including §0§, §1§, §2§ and __peekle_0__ style markers.
                - Preserve programming identifiers, numbers, code values, booleans, and inline code meaning.
                - Do not translate labels named Input or Output if they appear.
                - Translate Explanation text naturally into Korean.
                - Do not add commentary, markdown, or extra keys.

                Input JSON array:
                %s
                """.formatted(objectMapper.writeValueAsString(texts));
    }

    private List<String> parseTranslations(JsonNode response, int expectedSize) throws JsonProcessingException {
        if (response == null) {
            throw new BusinessException(ErrorCode.TRANSLATION_INVALID_RESPONSE);
        }

        String text = response.path("candidates")
                .path(0)
                .path("content")
                .path("parts")
                .path(0)
                .path("text")
                .asText();

        if (!StringUtils.hasText(text)) {
            throw new BusinessException(ErrorCode.TRANSLATION_INVALID_RESPONSE);
        }

        JsonNode parsed = objectMapper.readTree(stripJsonFence(text));
        JsonNode translationsNode = parsed.isArray() ? parsed : parsed.path("translations");

        if (!translationsNode.isArray() || translationsNode.size() != expectedSize) {
            throw new BusinessException(ErrorCode.TRANSLATION_INVALID_RESPONSE);
        }

        List<String> translations = new ArrayList<>(expectedSize);
        translationsNode.forEach(node -> translations.add(node.asText()));
        return translations;
    }

    private String stripJsonFence(String text) {
        String trimmed = text.trim();
        if (!trimmed.startsWith("```")) {
            return trimmed;
        }

        int firstNewline = trimmed.indexOf('\n');
        if (firstNewline < 0) {
            return trimmed;
        }

        String withoutOpeningFence = trimmed.substring(firstNewline + 1).trim();
        if (withoutOpeningFence.endsWith("```")) {
            return withoutOpeningFence.substring(0, withoutOpeningFence.length() - 3).trim();
        }
        return withoutOpeningFence;
    }

    private String abbreviate(String value) {
        if (value == null || value.length() <= 500) {
            return value;
        }
        return value.substring(0, 500) + "...";
    }
}
