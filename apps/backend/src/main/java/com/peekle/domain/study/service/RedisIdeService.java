package com.peekle.domain.study.service;

import com.peekle.domain.study.dto.ide.IdeRequest;
import com.peekle.domain.study.dto.ide.IdeResponse;
import com.peekle.domain.user.entity.User;
import com.peekle.domain.user.repository.UserRepository;
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
     * Save user's code to Redis Hash
     */
    public void saveCode(Long studyId, Long userId, IdeRequest request) {
        String key = String.format(RedisKeyConst.IDE_KEY, studyId, userId);

        Map<String, String> data = new HashMap<>();
        data.put("filename", request.getFilename());
        data.put("code", request.getCode());
        data.put("lang", request.getLang());
        data.put("updatedAt", LocalDateTime.now().toString());

        redisTemplate.opsForHash().putAll(key, data);
        // Optional: Set expire time if needed (e.g., 24 hours)
        // redisTemplate.expire(key, 24, TimeUnit.HOURS);
    }

    /**
     * Get user's code snapshot from Redis
     */
    public IdeResponse getCode(Long studyId, Long userId) {
        String key = String.format(RedisKeyConst.IDE_KEY, studyId, userId);
        Map<Object, Object> entries = redisTemplate.opsForHash().entries(key);

        if (entries.isEmpty()) {
            return null;
        }

        // Get user info separately (or cache it)
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));

        return IdeResponse.builder()
                .senderId(userId)
                .senderName(user.getNickname())
                .filename((String) entries.getOrDefault("filename", "Untitled"))
                .code((String) entries.getOrDefault("code", ""))
                .lang((String) entries.getOrDefault("lang", "text"))
                .build();
    }

    /**
     * Add a watcher to the target user's list
     */
    public void addWatcher(Long studyId, Long targetUserId, Long viewerId) {
        String key = String.format(RedisKeyConst.IDE_WATCHERS, studyId, targetUserId);
        redisTemplate.opsForSet().add(key, viewerId.toString());

        // Also track what the viewer is watching (for clean disconnect)
        // Key: user:{viewerId}:watching:{studyId} -> targetUserId
        // This helps when viewer disconnects, we know which target's set to remove them
        // from.
        String viewerKey = "user:" + viewerId + ":watching:" + studyId;
        redisTemplate.opsForSet().add(viewerKey, targetUserId.toString());
    }

    /**
     * Remove a watcher from the target user's list
     */
    public void removeWatcher(Long studyId, Long targetUserId, Long viewerId) {
        String key = String.format(RedisKeyConst.IDE_WATCHERS, studyId, targetUserId);
        redisTemplate.opsForSet().remove(key, viewerId.toString());

        String viewerKey = "user:" + viewerId + ":watching:" + studyId;
        redisTemplate.opsForSet().remove(viewerKey, targetUserId.toString());
    }

    /**
     * Get all watchers for a target user
     */
    public java.util.Set<String> getWatchers(Long studyId, Long targetUserId) {
        String key = String.format(RedisKeyConst.IDE_WATCHERS, studyId, targetUserId);
        java.util.Set<Object> members = redisTemplate.opsForSet().members(key);

        if (members == null || members.isEmpty()) {
            return java.util.Collections.emptySet();
        }

        // Convert Set<Object> (Redis default) to Set<String>
        return members.stream()
                .map(Object::toString)
                .collect(java.util.stream.Collectors.toSet());
    }

    /**
     * Get all targets a user is currently watching (for cleanup)
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
