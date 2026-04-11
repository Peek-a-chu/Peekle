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
public class RedisCsAttemptStore implements CsAttemptStore {

    private static final Duration ATTEMPT_TTL = Duration.ofHours(6);

    private final RedisTemplate<String, Object> redisTemplate;
    private final ObjectMapper objectMapper;

    @Override
    public void save(CsAttemptSession session) {
        redisTemplate.opsForValue().set(key(session.getUserId(), session.getStageId()), session, ATTEMPT_TTL);
    }

    @Override
    public Optional<CsAttemptSession> find(Long userId, Long stageId) {
        Object value = redisTemplate.opsForValue().get(key(userId, stageId));
        if (value == null) {
            return Optional.empty();
        }

        if (value instanceof CsAttemptSession session) {
            return Optional.of(session);
        }

        try {
            return Optional.of(objectMapper.convertValue(value, CsAttemptSession.class));
        } catch (IllegalArgumentException ignored) {
            return Optional.empty();
        }
    }

    @Override
    public void delete(Long userId, Long stageId) {
        redisTemplate.delete(key(userId, stageId));
    }

    private String key(Long userId, Long stageId) {
        return String.format(RedisKeyConst.CS_ATTEMPT, userId, stageId);
    }
}
