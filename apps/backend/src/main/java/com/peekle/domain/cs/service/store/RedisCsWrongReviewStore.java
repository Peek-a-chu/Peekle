package com.peekle.domain.cs.service.store;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.peekle.global.redis.RedisKeyConst;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Optional;

@Component
@Profile("!test")
@RequiredArgsConstructor
public class RedisCsWrongReviewStore implements CsWrongReviewStore {

    private static final Duration REVIEW_TTL = Duration.ofHours(6);

    private final RedisTemplate<String, Object> redisTemplate;
    private final ObjectMapper objectMapper;

    @Override
    public void save(CsWrongReviewSession session) {
        redisTemplate.opsForValue().set(key(session.getUserId(), session.getReviewId()), session, REVIEW_TTL);
    }

    @Override
    public Optional<CsWrongReviewSession> find(Long userId, String reviewId) {
        Object value = redisTemplate.opsForValue().get(key(userId, reviewId));
        if (value == null) {
            return Optional.empty();
        }

        if (value instanceof CsWrongReviewSession session) {
            return Optional.of(session);
        }

        try {
            return Optional.of(objectMapper.convertValue(value, CsWrongReviewSession.class));
        } catch (IllegalArgumentException ignored) {
            return Optional.empty();
        }
    }

    @Override
    public void delete(Long userId, String reviewId) {
        redisTemplate.delete(key(userId, reviewId));
    }

    private String key(Long userId, String reviewId) {
        return String.format(RedisKeyConst.CS_WRONG_REVIEW, userId, reviewId);
    }
}
