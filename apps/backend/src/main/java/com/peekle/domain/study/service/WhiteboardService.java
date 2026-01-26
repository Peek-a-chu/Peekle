package com.peekle.domain.study.service;

import com.peekle.domain.study.dto.whiteboard.WhiteboardRequest;
import com.peekle.domain.study.dto.whiteboard.WhiteboardResponse;
import com.peekle.domain.user.entity.User;
import com.peekle.domain.user.repository.UserRepository;
import com.peekle.global.exception.BusinessException;
import com.peekle.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class WhiteboardService {

    private final RedisTemplate<String, Object> redisTemplate;
    private final SimpMessagingTemplate messagingTemplate;
    private final UserRepository userRepository;

    // 키 생성 헬퍼 메서드 (중복 코드 방지)
    // 화이트보드 상태값
    private String getHistoryKey(Long studyId) {
        return "study:" + studyId + ":whiteboard:history";
    }

    // 잠금 상태, 방장 정보, 활성화 여부
    private String getConfigKey(Long studyId) {
        return "study:" + studyId + ":whiteboard:config";
    }

    // 화이트보드 시작
    public void startWhiteboard(Long studyId, Long userId) {

        String key = getConfigKey(studyId);

        // 이미 화이트보드가 켜져있는지 확인 필요
        Object activeValue = redisTemplate.opsForHash().get(key, "isActive");

        if (activeValue != null && activeValue.toString().equals("true")){
            // 이미 화이트보드 열려있음
            throw new BusinessException(ErrorCode.WHITEBOARD_ALREADY_ACTIVE);
        }

        // ConfigKey 저장 (Owner, Status, IsActive)
        Map<String, String> config = new HashMap<>();

        config.put("ownerId", String.valueOf(userId)); // 방장 ID
        config.put("isActive", "true"); // 켜짐 표시
        config.put("status", "UNLOCKED"); // 잠금 해제

        redisTemplate.opsForHash().putAll(key, config);

        redisTemplate.expire(key, Duration.ofHours(24)); // TTL 설정

        String nickName = userRepository.findById(userId).map(User::getNickname).orElse("Unknown");

        WhiteboardResponse startMessage = WhiteboardResponse.builder()
                .type("START")
                .senderId(userId)
                .senderName(nickName)
                .data("Session Started")
                .build();
        messagingTemplate.convertAndSend("/topic/studies/rooms/" + studyId + "/whiteboard", startMessage);
    }

    // 화이트보드 종료
    public void stopWhiteboard(Long studyId, Long userId){
        String configKey = getConfigKey(studyId);
        String historyKey = getHistoryKey(studyId);

        // 권한 확인(주인장만 끌수있음 -> 화이트보드를 킨 사람)
        Object ownerId = redisTemplate.opsForHash().get(configKey, "ownerId");
        if(ownerId == null || !String.valueOf(userId).equals(ownerId.toString())) {
            throw new BusinessException(ErrorCode.WHITEBOARD_PERMISSION_DENIED);
        }

        // 데이터 지우기
        redisTemplate.delete(List.of(configKey, historyKey));

        // 종료 메시지
        WhiteboardResponse closeMessage = WhiteboardResponse.builder()
                .type("CLOSE")
                .data("Session Closed by Leader")
                .build();

        messagingTemplate.convertAndSend("/topic/studies/rooms/" + studyId + "/whiteboard", closeMessage);

    }

    // 초기 화이트보드 상태값 확인
    public void getWhiteboardState(Long studyId, Long userId) {
        String configKey = getConfigKey(studyId);
        String historyKey = getHistoryKey(studyId);

        // Reids 정보 조회
        Map<Object, Object> config = redisTemplate.opsForHash().entries(configKey);

        boolean isActive = config.containsKey("isActive") && "true".equals(config.get("isActive").toString());

        // 데이터 구성
        Map<String, Object> stateData = new HashMap<>();
        stateData.put("isActive", isActive);

        if (isActive) {
            // 활성화 상태라면 이력(History)과 방장 정보도 포함
            List<Object> history = redisTemplate.opsForList().range(historyKey, 0, -1);
            stateData.put("history", history);
            stateData.put("ownerId", config.get("ownerId"));
            stateData.put("status", config.get("status"));
        }

        // 응답값
        WhiteboardResponse sync = WhiteboardResponse.builder()
                .type("SYNC")
                .data(stateData)
                .timestamp(LocalDateTime.now())
                .build();

        messagingTemplate.convertAndSend(
                "/topic/studies/rooms/" + studyId + "/whiteboard/" + userId,
                sync);
    }

    public void saveDrawEvent(Long studyId, WhiteboardRequest request) {
        String configKey = getConfigKey(studyId);

        // 활성화 상태 확인
        Object isActive = redisTemplate.opsForHash().get(configKey, "isActive");

        if(isActive == null || !isActive.toString().equals("true")) {
            throw new BusinessException(ErrorCode.WHITEBOARD_NOT_FOUND);
        }

        // Redis List 데이터 저장
        String historyKey = getHistoryKey(studyId);

        redisTemplate.opsForList().rightPush(historyKey, request.getData());

        redisTemplate.expire(historyKey, Duration.ofHours(24));

        // 실시간 알림 전파
        messagingTemplate.convertAndSend("/topic/studies/rooms/" + studyId + "/whiteboard", request);
    }

    public void clearWhiteboard(Long studyId, Long userId) {
        String configKey = getConfigKey(studyId);
        String historyKey = getHistoryKey(studyId);

        // 활성화 여부 확인
        Object isActive = redisTemplate.opsForHash().get(configKey, "isActive");

        if (isActive == null || !isActive.toString().equals("true")) {
            throw new BusinessException(ErrorCode.WHITEBOARD_NOT_FOUND);
        }

        // 권한 확인(주인장만 전체 지우기 권한 주기)
        Object ownerId = redisTemplate.opsForHash().get(configKey, "ownerId");
        if(ownerId == null || !String.valueOf(userId).equals(ownerId.toString())) {
            throw new BusinessException(ErrorCode.WHITEBOARD_PERMISSION_DENIED);
        }

        redisTemplate.delete(historyKey);

        WhiteboardResponse clearMessage = WhiteboardResponse.builder()
                .type("CLEAR")
                .data(null)
                .build();

        messagingTemplate.convertAndSend("/topic/studies/rooms/" + studyId + "/whiteboard", clearMessage);

    }
}
