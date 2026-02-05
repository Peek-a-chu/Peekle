package com.peekle.domain.auth.service;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.concurrent.TimeUnit;

@Service
public class RefreshTokenService {

    private static final String KEY_PREFIX = "refresh_token:";

    private final StringRedisTemplate redisTemplate;

    public RefreshTokenService(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    public void save(Long userId, String refreshToken, long expiryMs) {
        String key = KEY_PREFIX + userId;
        redisTemplate.opsForValue().set(key, refreshToken, expiryMs, TimeUnit.MILLISECONDS);
    }

    public String get(Long userId) {
        String key = KEY_PREFIX + userId;
        return redisTemplate.opsForValue().get(key);
    }

    public void delete(Long userId) {
        String key = KEY_PREFIX + userId;
        redisTemplate.delete(key);
    }

    public boolean exists(Long userId) {
        String key = KEY_PREFIX + userId;
        return Boolean.TRUE.equals(redisTemplate.hasKey(key));
    }
}
