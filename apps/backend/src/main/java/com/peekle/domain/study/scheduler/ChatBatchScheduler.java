package com.peekle.domain.study.scheduler;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.peekle.domain.study.dto.chat.ChatMessageResponse;
import com.peekle.domain.study.repository.ChatJdbcRepository;
import com.peekle.global.redis.RedisKeyConst;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class ChatBatchScheduler {

    private final RedisTemplate<String, Object> redisTemplate;
    private final ChatJdbcRepository chatJdbcRepository;
    private final ObjectMapper objectMapper;

    // 한번에 처리할 배치 사이즈
    private static final int BATCH_SIZE = 100;

    /**
     * Flush Chat Buffer to DB (Every 1000ms)
     */
    @Scheduled(fixedRate = 10000)
    @Transactional
    public void flushChatBuffer() {
        // 1. Check Buffer Size
        Long size = redisTemplate.opsForList().size(RedisKeyConst.CHAT_BUFFER);
        if (size == null || size == 0) {
            return;
        }

        // 2. Redis에서 데이터 꺼내기 (BATCH_SIZE 제한)
        List<ChatMessageResponse> batchList = new ArrayList<>();

        // LPOP: 왼쪽에서 꺼냅니다. (FIFO: 먼저 들어온 것이 먼저 나감)
        // Redis List 자료구조에서 RightPush로 넣었으므로 LeftPop으로 꺼내야 시간 순서대로 처리됩니다.

        // 전략:
        // 루아 스크립트나 범위 기반 처리를 사용하지 않고, 안전하게 하나씩 LPOP 합니다.
        // 애플리케이션이 꺼내고 나서 DB 저장 전에 죽으면 데이터 소실 위험이 있지만,
        // 현재는 구현 복잡도를 낮추기 위해 이 방식을 사용합니다.
        // (더 안정적인 방법: RPOPLPUSH 등으로 처리 중 목록 관리 또는 Redis Stream 사용)

        // 참고:
        // RedisConfig는 GenericJackson2JsonRedisSerializer를 사용하지만,
        // RedisChatBufferService에서 직접 JSON 문자열로 직렬화하여 넣었으므로
        // 꺼낼 때도 String으로 꺼내서 수동 역직렬화 합니다.

        for (int i = 0; i < BATCH_SIZE; i++) {
            Object obj = redisTemplate.opsForList().leftPop(RedisKeyConst.CHAT_BUFFER);
            if (obj == null)
                break;

            try {
                // obj는 우리가 직접 JSON 문자열로 저장했으므로 String입니다.
                String jsonStr = (String) obj;
                ChatMessageResponse chat = objectMapper.readValue(jsonStr, ChatMessageResponse.class);
                batchList.add(chat);
            } catch (Exception e) {
                log.error("Failed to parse buffered chat log", e);
                // 잘못된 데이터는 버립니다.
            }
        }

        if (batchList.isEmpty())
            return;

        // 3. DB에 일괄 저장 (Bulk Insert)
        try {
            chatJdbcRepository.batchInsertChatLogs(batchList);
            log.info("Flushed {} chat logs to DB.", batchList.size());
        } catch (Exception e) {
            log.error("Batch Insert Failed!", e);
            // 중요: Redis에서 데이터를 꺼냈는데 DB 저장에 실패한 경우입니다.
            // 이상적으로는 데이터를 다시 Redis에 넣거나(DLQ), 재시도 로직이 필요합니다.
            // 현재는 에러 로그만 남깁니다.
            // 고급: RightPushAll을 사용하여 다시 CHAT_BUFFER(Head)에 넣거나 DLQ로 보낼 수 있습니다.
        }
    }
}
