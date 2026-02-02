package com.peekle.domain.ai.dto.request;

public record TagStatDto(
    String tagName,
    double accuracyRate,
    int attemptCount
) {}
