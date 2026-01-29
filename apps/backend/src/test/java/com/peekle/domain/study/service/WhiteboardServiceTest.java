package com.peekle.domain.study.service;

import com.peekle.domain.study.dto.whiteboard.WhiteboardResponse;
import com.peekle.domain.user.repository.UserRepository;
import com.peekle.global.redis.RedisKeyConst;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.redis.core.HashOperations;
import org.springframework.data.redis.core.ListOperations;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class WhiteboardServiceTest {

    @Test
    void getWhiteboardState_includesHistoryEvenWhenInactive() {
        // given
        @SuppressWarnings("unchecked")
        RedisTemplate<String, Object> redisTemplate = (RedisTemplate<String, Object>) mock(RedisTemplate.class);
        SimpMessagingTemplate messagingTemplate = mock(SimpMessagingTemplate.class);
        UserRepository userRepository = mock(UserRepository.class);

        @SuppressWarnings("unchecked")
        HashOperations<String, Object, Object> hashOps = mock(HashOperations.class);
        @SuppressWarnings("unchecked")
        ListOperations<String, Object> listOps = mock(ListOperations.class);

        when(redisTemplate.opsForHash()).thenReturn(hashOps);
        when(redisTemplate.opsForList()).thenReturn(listOps);

        Long studyId = 1L;
        Long userId = 777L;

        String configKey = String.format(RedisKeyConst.WHITEBOARD_CONFIG, studyId);
        String historyKey = String.format(RedisKeyConst.WHITEBOARD_HISTORY, studyId);

        // config is empty => isActive=false
        when(hashOps.entries(configKey)).thenReturn(new HashMap<>());
        // history exists
        Map<String, Object> h1 = Map.of("action", "ADDED", "objectId", "a1", "data", Map.of("type", "rect"));
        when(listOps.range(historyKey, 0, -1)).thenReturn(List.of(h1));

        WhiteboardService service = new WhiteboardService(redisTemplate, messagingTemplate, userRepository);

        // when
        service.getWhiteboardState(studyId, userId);

        // then: SYNC should still be sent and include history
        ArgumentCaptor<Object> payloadCaptor = ArgumentCaptor.forClass(Object.class);
        verify(messagingTemplate, atLeastOnce()).convertAndSend(any(String.class), payloadCaptor.capture());

        WhiteboardResponse sync = payloadCaptor.getAllValues().stream()
                .filter(WhiteboardResponse.class::isInstance)
                .map(WhiteboardResponse.class::cast)
                .filter(r -> "SYNC".equals(r.getAction()))
                .findFirst()
                .orElse(null);

        assertThat(sync).isNotNull();
        assertThat(sync.getData()).isInstanceOf(Map.class);

        @SuppressWarnings("unchecked")
        Map<String, Object> data = (Map<String, Object>) sync.getData();
        assertThat(data).containsKey("history");
        assertThat(data.get("history")).isInstanceOf(List.class);

        // Verify it publishes to room broadcast topic at least once (the user-topic is also sent)
        String broadcastTopic = String.format("/" + RedisKeyConst.TOPIC_WHITEBOARD, studyId);
        verify(messagingTemplate, atLeastOnce()).convertAndSend(eq(broadcastTopic), any(Object.class));
    }
}

