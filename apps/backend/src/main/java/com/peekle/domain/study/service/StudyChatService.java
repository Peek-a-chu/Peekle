package com.peekle.domain.study.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.peekle.domain.study.dto.chat.ChatMessageRequest;
import com.peekle.domain.study.dto.chat.ChatMessageResponse;
import com.peekle.domain.study.entity.StudyChatLog;
import com.peekle.domain.study.repository.StudyChatRepository;
import com.peekle.domain.user.entity.User;
import com.peekle.domain.user.repository.UserRepository;
import com.peekle.global.exception.BusinessException;
import com.peekle.global.exception.ErrorCode;
import com.peekle.global.redis.RedisKeyConst;
import com.peekle.global.redis.RedisPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.listener.ChannelTopic;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@org.springframework.transaction.annotation.Transactional(readOnly = true)
public class StudyChatService {

    private final UserRepository userRepository;
    private final RedisTemplate<String, Object> redisTemplate;
    private final RedisPublisher redisPublisher;
    // private final ChatPersistenceService chatPersistenceService; // Replaced by
    // Buffer
    private final RedisChatBufferService redisChatBufferService;
    private final StudyChatRepository studyChatRepository;
    private final com.peekle.domain.study.repository.StudyRoomRepository studyRoomRepository;
    private final ObjectMapper objectMapper; // For Redis serialization

    // Redis 캐시 크기 (최신 N개의 메시지)
    private static final int REDIS_CHAT_CACHE_SIZE = 100;

    /**
     * 채팅 전송 (Redis Write-Through + 비동기 DB 저장)
     */
    public void sendChat(Long studyId, Long userId, ChatMessageRequest request) {
        // 0. 스터디 방 존재 여부 확인 (대량 삽입 시 FK 위반 방지)
        if (!studyRoomRepository.existsById(studyId)) {
            throw new BusinessException(ErrorCode.STUDY_ROOM_NOT_FOUND);
        }

        // 1. 보낸 사람 정보 조회 (캐시 또는 DB)
        User sender = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        // 2. 응답 DTO 생성 (즉시 반환)
        // 참고: ID는 보통 DB에서 생성됨. Redis 전용 단계에서는 타임스탬프나 임시 ID를 사용할 수 있음.
        // 여기서는 아직 DB ID를 할당하지 않음.
        ChatMessageResponse response = ChatMessageResponse.builder()
                .studyId(studyId)
                .senderId(userId)
                .senderName(sender.getNickname())
                .content(request.getContent())
                .type(request.getType())
                .parentId(request.getParentId())
                .metadata(request.getMetadata())
                .createdAt(LocalDateTime.now())
                .build();

        // 3. Redis 리스트에 저장 (Right Push)
        String key = String.format(RedisKeyConst.CHAT_ROOM_LOGS, studyId);
        try {
            // 일관된 저장을 위해 JSON으로 직렬화
            String json = objectMapper.writeValueAsString(response);
            redisTemplate.opsForList().rightPush(key, json);
            // 최신 N개만 유지하도록 리스트 정리
            redisTemplate.opsForList().trim(key, -REDIS_CHAT_CACHE_SIZE, -1);
        } catch (Exception e) {
            log.error("Redis Push Failed", e);
        }

        // 4. Redis 발행 (실시간)
        String topic = String.format(RedisKeyConst.TOPIC_STUDY_CHAT, studyId);
        redisPublisher.publish(new ChannelTopic(topic), com.peekle.global.socket.SocketResponse.of("CHAT", response));

        // 5. 비동기 일괄 저장을 위해 Redis에 버퍼링
        redisChatBufferService.bufferChat(response);
        // chatPersistenceService.saveChatToDB(studyId, userId, request); // Deprecated
    }

    /**
     * 채팅 기록 조회 (하이브리드: Redis -> DB)
     */
    public Page<ChatMessageResponse> getChatHistory(Long studyId, Pageable pageable) {
        // 첫 페이지 요청 시 Redis 먼저 조회 (가장 빠름)
        if (pageable.getPageNumber() == 0) {
            String key = String.format(RedisKeyConst.CHAT_ROOM_LOGS, studyId);
            Long size = redisTemplate.opsForList().size(key);

            if (size != null && size > 0) {
                // Redis에서 최신 메시지 조회 (리스트는 삽입 순서로 정렬됨)
                // UI를 위해 내림차순(최신순)으로 정렬? 아니면 오름차순?
                // 보통 history API는 0페이지를 "가장 최신 항목들"로 반환함.
                // Redis List: [가장 오래된 ... 가장 최신]
                // 이를 뒤집거나 끝에서부터 가져와야 함.

                int pageSize = pageable.getPageSize();
                long start = Math.max(0, size - pageSize);
                long end = size - 1;

                List<Object> redisLogs = redisTemplate.opsForList().range(key, start, end);
                if (redisLogs != null) {
                    List<ChatMessageResponse> fastList = redisLogs.stream()
                            .map(obj -> {
                                try {
                                    return objectMapper.readValue(obj.toString(), ChatMessageResponse.class);
                                } catch (Exception e) {
                                    return null;
                                }
                            })
                            .filter(java.util.Objects::nonNull)
                            .collect(Collectors.toList());

                    // 0페이지를 위해 최신순으로 뒤집기
                    Collections.reverse(fastList);

                    if (fastList.size() >= pageSize) {
                        return new PageImpl<>(fastList, pageable, size + 1000); // 대략적인 전체 개수
                    }
                }
            }
        }

        // 폴백 또는 이전 페이지: DB 조회
        Page<StudyChatLog> dbPage = studyChatRepository.findAllByStudyIdOrderByCreatedAtDesc(studyId, pageable);
        return dbPage.map(ChatMessageResponse::from);
    }
}
