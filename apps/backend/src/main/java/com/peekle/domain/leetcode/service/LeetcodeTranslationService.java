package com.peekle.domain.leetcode.service;

import com.peekle.domain.leetcode.dto.response.LeetcodeTranslationResponse;
import com.peekle.global.exception.BusinessException;
import com.peekle.global.exception.ErrorCode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import java.util.List;
import java.util.Map;

@Service
@Slf4j
public class LeetcodeTranslationService {

    private final RestClient aiRestClient;
    private final int maxBatchSize;
    private final int maxTextLength;
    private final int maxTotalLength;

    public LeetcodeTranslationService(
            RestClient aiRestClient,
            @Value("${leetcode.translation.max-batch-size:20}") int maxBatchSize,
            @Value("${leetcode.translation.max-text-length:2000}") int maxTextLength,
            @Value("${leetcode.translation.max-total-length:12000}") int maxTotalLength
    ) {
        this.aiRestClient = aiRestClient;
        this.maxBatchSize = maxBatchSize;
        this.maxTextLength = maxTextLength;
        this.maxTotalLength = maxTotalLength;
    }

    public List<String> translate(List<String> texts) {
        validateRequest(texts);

        try {
            LeetcodeTranslationResponse response = aiRestClient.post()
                    .uri("/translate/leetcode")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("texts", texts))
                    .retrieve()
                    .body(LeetcodeTranslationResponse.class);

            if (response == null || response.translations() == null || response.translations().size() != texts.size()) {
                throw new BusinessException(ErrorCode.TRANSLATION_INVALID_RESPONSE);
            }
            return response.translations();
        } catch (RestClientResponseException e) {
            log.warn("AI 서버 LeetCode 번역 오류 - status: {}, body: {}",
                    e.getStatusCode(), abbreviate(e.getResponseBodyAsString()));
            throw new BusinessException(ErrorCode.TRANSLATION_PROVIDER_ERROR);
        } catch (RestClientException e) {
            log.warn("AI 서버 LeetCode 번역 호출 실패", e);
            throw new BusinessException(ErrorCode.TRANSLATION_PROVIDER_ERROR);
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

    private String abbreviate(String value) {
        if (value == null || value.length() <= 500) {
            return value;
        }
        return value.substring(0, 500) + "...";
    }
}
