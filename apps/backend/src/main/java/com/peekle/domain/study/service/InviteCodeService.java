package com.peekle.domain.study.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import com.peekle.global.exception.BusinessException;
import com.peekle.global.exception.ErrorCode;

@Service
@RequiredArgsConstructor
public class InviteCodeService {

    private final StringRedisTemplate redisTemplate;
    private static final String KEY_PREFIX = "invite:code:";
    private static final Duration DEFAULT_TTL = Duration.ofMinutes(5);

    public void saveInviteCode(String code, Long studyRoomId) {
        redisTemplate.opsForValue().set(
                KEY_PREFIX + code,
                String.valueOf(studyRoomId),
                DEFAULT_TTL);
    }

    public Long getStudyRoomId(String code) {
        String value = redisTemplate.opsForValue().get(KEY_PREFIX + code);
        if (value == null) {
            throw new BusinessException(ErrorCode.INVALID_INVITE_CODE);
        }
        return Long.parseLong(value);
    }
}
