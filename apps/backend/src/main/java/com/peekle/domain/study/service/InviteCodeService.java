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
    private static final String ROOM_KEY_PREFIX = "invite:room:";
    private static final Duration DEFAULT_TTL = Duration.ofMinutes(5);

    public void saveInviteCode(String code, Long studyRoomId) {
        // 1. 기존에 발급된 코드가 있는지 확인
        String oldCode = redisTemplate.opsForValue().get(ROOM_KEY_PREFIX + studyRoomId);

        // 2. 기존 코드가 있다면 삭제 (무효화)
        if (oldCode != null) {
            redisTemplate.delete(KEY_PREFIX + oldCode);
        }

        // 3. 새로운 코드 저장 (Code -> StudyId)
        redisTemplate.opsForValue().set(
                KEY_PREFIX + code,
                String.valueOf(studyRoomId),
                DEFAULT_TTL);

        // 4. 스터디 방의 현재 코드 업데이트 (StudyId -> Code)
        redisTemplate.opsForValue().set(
                ROOM_KEY_PREFIX + studyRoomId,
                code,
                DEFAULT_TTL);
    }

    public Long getStudyRoomId(String code) {
        String value = redisTemplate.opsForValue().get(KEY_PREFIX + code);
        System.out.println("[InviteCodeService] Resolving code: " + code + " -> " + value);
        if (value == null) {
            throw new BusinessException(ErrorCode.INVALID_INVITE_CODE);
        }
        return Long.parseLong(value);
    }
}
