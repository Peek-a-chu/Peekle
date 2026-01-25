package com.peekle.global.redis;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.peekle.global.socket.SocketResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.connection.Message;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class RedisSubscriber implements MessageListener {

    private final ObjectMapper objectMapper;
    private final RedisTemplate<String, Object> redisTemplate;
    private final SimpMessagingTemplate messagingTemplate;

    @Override
    public void onMessage(Message message, byte[] pattern) {
        try {
            // Redis에서 수신한 메시지 (JSON String)
            String publishMessage = (String) redisTemplate.getStringSerializer().deserialize(message.getBody());

            SocketResponse<?> roomMessage = objectMapper.readValue(publishMessage, SocketResponse.class);

            // Topic: topic/study/room/{id} -> Stomp: /topic/study/room/{id}
            String topic = new String(message.getChannel());

            messagingTemplate.convertAndSend("/" + topic, roomMessage);
            log.info("Redis Sub >> Stomp Send: {} -> {}", topic, roomMessage);

        } catch (Exception e) {
            log.error("Redis Subscriber Error", e);
        }
    }
}
