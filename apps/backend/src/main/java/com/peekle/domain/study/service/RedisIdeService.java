package com.peekle.domain.study.service;

import com.peekle.domain.study.dto.ide.IdeRequest;
import com.peekle.domain.study.dto.ide.IdeResponse;
import com.peekle.domain.user.entity.User;
import com.peekle.domain.user.repository.UserRepository;
import com.peekle.global.exception.BusinessException;
import com.peekle.global.exception.ErrorCode;
import com.peekle.global.redis.RedisKeyConst;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class RedisIdeService {

    private final RedisTemplate<String, Object> redisTemplate;
    private final UserRepository userRepository;

    /**
     * 사용자 코드를 Redis Hash에 저장
     */
    public void saveCode(Long studyId, Long userId, IdeRequest request) {
        // Safe check for problemId
        Long problemId = (request.getProblemId() != null) ? request.getProblemId() : 0L; // 0L for default or unknown
        String key = String.format(RedisKeyConst.IDE_KEY, studyId, problemId, userId);

        Map<String, String> data = new HashMap<>();
        data.put("problemId", problemId.toString());
        data.put("filename", request.getFilename());
        data.put("code", request.getCode());
        data.put("lang", request.getLang());
        data.put("updatedAt", LocalDateTime.now().toString());

        redisTemplate.opsForHash().putAll(key, data);
        // 옵션: 필요한 경우 만료 시간 설정 (예: 24시간)
        // redisTemplate.expire(key, 24, TimeUnit.HOURS);
    }

    /**
     * Redis에서 사용자 코드 스냅샷 조회
     */
    public IdeResponse getCode(Long studyId, Long problemId, Long userId) {
        String key = String.format(RedisKeyConst.IDE_KEY, studyId, problemId, userId);
        Map<Object, Object> entries = redisTemplate.opsForHash().entries(key);

        if (entries.isEmpty()) {
            return null;
        }

        // 사용자 정보 별도 조회 (또는 캐시)
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        return IdeResponse.builder()
                .senderId(userId)
                .senderName(user.getNickname())
                .problemId(problemId)
                .filename((String) entries.getOrDefault("filename", "Untitled"))
                .code((String) entries.getOrDefault("code", ""))
                .lang((String) entries.getOrDefault("lang", "text"))
                .build();
    }

    /**
     * 대상 사용자의 감시자 목록에 추가
     */
    public void addWatcher(Long studyId, Long targetUserId, Long viewerId) {
        String key = String.format(RedisKeyConst.IDE_WATCHERS, studyId, targetUserId);
        redisTemplate.opsForSet().add(key, viewerId.toString());

        // 시청자가 무엇을 보고 있는지 추적 (깔끔한 연결 종료를 위해)
        // Key: user:{viewerId}:watching:{studyId} -> targetUserId
        // 시청자가 연결을 끊을 때 어떤 대상의 Set에서 제거해야 하는지 알 수 있음.
        String viewerKey = "user:" + viewerId + ":watching:" + studyId;
        redisTemplate.opsForSet().add(viewerKey, targetUserId.toString());
    }

    /**
     * 대상 사용자의 감시자 목록에서 제거
     */
    public void removeWatcher(Long studyId, Long targetUserId, Long viewerId) {
        String key = String.format(RedisKeyConst.IDE_WATCHERS, studyId, targetUserId);
        redisTemplate.opsForSet().remove(key, viewerId.toString());

        String viewerKey = "user:" + viewerId + ":watching:" + studyId;
        redisTemplate.opsForSet().remove(viewerKey, targetUserId.toString());
    }

    /**
     * 대상 사용자의 모든 감시자 조회
     */
    public java.util.Set<String> getWatchers(Long studyId, Long targetUserId) {
        String key = String.format(RedisKeyConst.IDE_WATCHERS, studyId, targetUserId);
        java.util.Set<Object> members = redisTemplate.opsForSet().members(key);

        if (members == null || members.isEmpty()) {
            return java.util.Collections.emptySet();
        }

        // Set<Object> (Redis 기본) -> Set<String> 변환
        return members.stream()
                .map(Object::toString)
                .collect(java.util.stream.Collectors.toSet());
    }

    /**
     * 사용자가 현재 감시 중인 모든 대상 조회 (정리용)
     */
    public java.util.Set<String> getWatchingTargets(Long studyId, Long viewerId) {
        String viewerKey = "user:" + viewerId + ":watching:" + studyId;
        java.util.Set<Object> targets = redisTemplate.opsForSet().members(viewerKey);
        if (targets == null)
            return java.util.Collections.emptySet();

        // Convert Object -> String
        return targets.stream().map(Object::toString).collect(java.util.stream.Collectors.toSet());
    }
}
