package com.peekle.domain.study.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.peekle.domain.study.dto.chat.ChatMessageResponse;
import com.peekle.global.redis.RedisKeyConst;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class RedisChatBufferService {

    private final RedisTemplate<String, Object> redisTemplate;
    private final ObjectMapper objectMapper;

    /**
     * Buffer chat message to Redis List (Global Buffer)
     */
    public void bufferChat(ChatMessageResponse chat) {
        try {
            String json = objectMapper.writeValueAsString(chat);
            redisTemplate.opsForList().rightPush(RedisKeyConst.CHAT_BUFFER, json);
        } catch (JsonProcessingException e) {
            log.error("Failed to buffer chat message", e);
        }
    }
}
