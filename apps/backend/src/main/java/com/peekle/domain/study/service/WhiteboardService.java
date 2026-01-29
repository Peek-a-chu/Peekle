package com.peekle.domain.study.service;

import com.peekle.domain.study.dto.whiteboard.WhiteboardRequest;
import com.peekle.domain.study.dto.whiteboard.WhiteboardResponse;
import com.peekle.domain.user.entity.User;
import com.peekle.domain.user.repository.UserRepository;
import com.peekle.global.exception.BusinessException;
import com.peekle.global.exception.ErrorCode;
import com.peekle.global.redis.RedisKeyConst;
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

    // 화이트보드 시작
    public void startWhiteboard(Long studyId, Long userId) {

        String key = String.format(RedisKeyConst.WHITEBOARD_CONFIG, studyId);

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

        String nickName = getUserNickname(userId);


        WhiteboardResponse startMessage = WhiteboardResponse.builder()
                .action("START") // Client가 이 이벤트를 받으면 "시작되었습니다" 토스트 띄움
                .senderId(userId)
                .senderName(nickName)
                .data("Session Started")
                .timestamp(LocalDateTime.now())
                .build();

        String topic = String.format("/" + RedisKeyConst.TOPIC_WHITEBOARD, studyId);
        messagingTemplate.convertAndSend(topic, startMessage);
    }

    // 화이트보드 종료
    public void stopWhiteboard(Long studyId, Long userId){
        String configKey = String.format(RedisKeyConst.WHITEBOARD_CONFIG, studyId);
        String historyKey = String.format(RedisKeyConst.WHITEBOARD_HISTORY, studyId);

        // 권한 확인(주인장만 끌수있음 -> 화이트보드를 킨 사람)
        Object ownerId = redisTemplate.opsForHash().get(configKey, "ownerId");
        if(ownerId == null || !String.valueOf(userId).equals(ownerId.toString())) {
            throw new BusinessException(ErrorCode.WHITEBOARD_PERMISSION_DENIED);
        }

        // 데이터 지우기
        redisTemplate.delete(List.of(configKey, historyKey));


        // 종료 메시지
        WhiteboardResponse closeMessage = WhiteboardResponse.builder()
                .action("CLOSE") // Client는 이 이벤트 받으면 캔버스 비활성화/닫기 처리
                .senderId(userId)
                .data("Session Closed by Leader")
                .timestamp(LocalDateTime.now())
                .build();

        String topic = String.format("/" + RedisKeyConst.TOPIC_WHITEBOARD, studyId);
        messagingTemplate.convertAndSend(topic, closeMessage);
    }

    // 초기 화이트보드 상태값 확인
    public void getWhiteboardState(Long studyId, Long userId) {
        String configKey = String.format(RedisKeyConst.WHITEBOARD_CONFIG, studyId);
        String historyKey = String.format(RedisKeyConst.WHITEBOARD_HISTORY, studyId);

        // Reids 정보 조회
        Map<Object, Object> config = redisTemplate.opsForHash().entries(configKey);

        boolean isActive = config.containsKey("isActive") && "true".equals(config.get("isActive").toString());

        // 데이터 구성
        Map<String, Object> stateData = new HashMap<>();
        stateData.put("isActive", isActive);

        // NOTE:
        // - 기존 구현은 isActive=false 일 때 history를 아예 포함하지 않아,
        //   클라이언트가 SYNC를 요청해도 빈 상태만 받는 문제가 발생할 수 있습니다.
        // - UI의 "화이트보드 창 ON/OFF"는 세션(isActive)과 별개로 동작할 수 있으므로,
        //   SYNC 응답에는 history를 항상 포함시켜 복원이 안정적으로 되도록 합니다.
        List<Object> history = redisTemplate.opsForList().range(historyKey, 0, -1);
        stateData.put("history", history);
        // config 값이 있으면 같이 내려줌 (없어도 무방)
        stateData.put("ownerId", config.get("ownerId"));
        stateData.put("status", config.get("status"));

        // 응답값
        WhiteboardResponse syncMessage = WhiteboardResponse.builder()
                .action("SYNC")
                .data(stateData)
                .timestamp(LocalDateTime.now())
                .build();

        // 1) 사용자 전용 토픽으로 전송 (기존 동작)
        String userTopic = String.format("/" + RedisKeyConst.TOPIC_WHITEBOARD_USER, studyId, userId);
        messagingTemplate.convertAndSend(userTopic, syncMessage);

        // 2) 동시에 방 브로드캐스트 토픽으로도 전송
        //    - 프론트에서 사용자 전용 토픽 구독이 늦게 되거나 userId 매칭에 실패해도
        //      최소한 방 공용 토픽으로 SYNC 데이터를 받을 수 있도록 보강
        String broadcastTopic = String.format("/" + RedisKeyConst.TOPIC_WHITEBOARD, studyId);
        messagingTemplate.convertAndSend(broadcastTopic, syncMessage);
    }

    public void saveDrawEvent(Long studyId, Long userId, WhiteboardRequest request) {
        String configKey = String.format(RedisKeyConst.WHITEBOARD_CONFIG, studyId);
        String historyKey = String.format(RedisKeyConst.WHITEBOARD_HISTORY, studyId);

        // 활성화 상태 확인
        Object isActive = redisTemplate.opsForHash().get(configKey, "isActive");
        if(isActive == null || !isActive.toString().equals("true")) {
            throw new BusinessException(ErrorCode.WHITEBOARD_NOT_FOUND);
        }

        // Redis List 데이터 저장
        String nickName = getUserNickname(userId);

        WhiteboardResponse response = WhiteboardResponse.from(request, userId, nickName);

        // 1. request.getData()만 저장하면 안 됨! -> response 객체 통째로 저장해야 함 (그래야 나중에 action, objectId를 알 수 있음)
        // 2. "CURSOR" (마우스 이동) 이벤트는 저장하지 않음 (DB 부하 방지, 실시간성만 중요)
        if (!"CURSOR".equals(request.getAction())) {
            redisTemplate.opsForList().rightPush(historyKey, response);
            redisTemplate.expire(historyKey, Duration.ofHours(24));
        }

        // 실시간 알림 전파
        String topic = String.format("/" + RedisKeyConst.TOPIC_WHITEBOARD, studyId);
        messagingTemplate.convertAndSend(topic, response);
    }

    public void clearWhiteboard(Long studyId, Long userId) {
        String configKey = String.format(RedisKeyConst.WHITEBOARD_CONFIG, studyId);
        String historyKey = String.format(RedisKeyConst.WHITEBOARD_HISTORY, studyId);

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

        String nickName = getUserNickname(userId);

        WhiteboardResponse clearMessage = WhiteboardResponse.builder()
                .action("CLEAR") // Client는 이걸 받으면 canvas.clear() 실행
                .senderId(userId)
                .senderName(nickName)
                .timestamp(LocalDateTime.now())
                .build();

        String topic = String.format("/" + RedisKeyConst.TOPIC_WHITEBOARD, studyId);
        messagingTemplate.convertAndSend(topic, clearMessage);

    }

    // 유저 닉네임 조회 헬퍼
    private String getUserNickname(Long userId) {
        return userRepository.findById(userId)
                .map(User::getNickname)
                .orElse("Unknown");
    }
}
