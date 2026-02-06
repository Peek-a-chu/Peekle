package com.peekle.domain.game.controller;

import com.peekle.domain.game.dto.request.GameChatRequest;
import com.peekle.domain.game.dto.request.GameCommonRequest;
import com.peekle.domain.game.service.RedisGameService;
import com.peekle.domain.user.repository.UserRepository;
import com.peekle.global.media.service.MediaService;
import com.peekle.global.socket.SocketResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

@Slf4j
@Controller
@RequiredArgsConstructor
public class GameSocketController {

    private final RedisGameService gameService;
    private final MediaService mediaService;
    private final SimpMessagingTemplate messagingTemplate;
    private final UserRepository userRepository;

    // 방 입장
    @MessageMapping("/games/enter")
    public void enter(@Payload com.peekle.domain.game.dto.request.GameEnterRequest request,
            SimpMessageHeaderAccessor headerAccessor) {
        Long userId = getUserId(headerAccessor);
        if (userId == null)
            return;
        // 세션에 gameId 저장 (Disconnect 시 처리를 위해)
        headerAccessor.getSessionAttributes().put("gameId", request.getGameId());

        gameService.enterGameRoom(request.getGameId(), userId, request.getPassword());

        // LiveKit 토큰 발급 및 전송
        try {
            String nickname = userRepository.findById(userId)
                    .map(com.peekle.domain.user.entity.User::getNickname)
                    .orElse("Player " + userId);
            String token = mediaService.createGameAccessToken(request.getGameId(), userId, nickname);
            log.info("Generated LiveKit token for user {}, game {}", userId, request.getGameId());

            messagingTemplate.convertAndSend(
                    "/topic/games/" + request.getGameId() + "/video-token/" + userId,
                    SocketResponse.of("VIDEO_TOKEN", token));
        } catch (Exception e) {
            log.error("LiveKit token generation failed for game {}: {}", request.getGameId(), e.getMessage());
            messagingTemplate.convertAndSend(
                    "/topic/games/" + request.getGameId() + "/video-token/" + userId,
                    SocketResponse.of("ERROR", "Video connection failed"));
        }
    }

    // 팀 변경
    @MessageMapping("/games/team")
    public void changeTeam(@Payload com.peekle.domain.game.dto.request.GameTeamRequest request,
            SimpMessageHeaderAccessor headerAccessor) {
        Long userId = getUserId(headerAccessor);
        if (userId == null)
            return;
        gameService.changeTeam(request.getGameId(), userId, request.getTeam());
    }

    // 방 퇴장
    @MessageMapping("/games/leave")
    public void leave(@Payload GameCommonRequest request, SimpMessageHeaderAccessor headerAccessor) {
        Long userId = getUserId(headerAccessor);
        if (userId == null)
            return;
        gameService.exitGameRoom(request.getGameId(), userId);
    }

    // 준비
    @MessageMapping("/games/ready")
    public void ready(@Payload GameCommonRequest request, SimpMessageHeaderAccessor headerAccessor) {
        Long userId = getUserId(headerAccessor);
        if (userId == null)
            return;
        gameService.toggleReady(request.getGameId(), userId);
    }

    // 게임 시작
    @MessageMapping("/games/start")
    public void start(@Payload GameCommonRequest request, SimpMessageHeaderAccessor headerAccessor) {
        Long userId = getUserId(headerAccessor);
        if (userId == null)
            return;
        gameService.startGame(request.getGameId(), userId);
    }

    // 채팅
    @MessageMapping("/games/chat")
    public void chat(@Payload GameChatRequest request, SimpMessageHeaderAccessor headerAccessor) {
        Long userId = getUserId(headerAccessor);
        if (userId == null)
            return;
        gameService.sendChatMessage(request, userId);
    }

    // 코드 저장
    @MessageMapping("/games/code/update")
    public void updateCode(@Payload com.peekle.domain.game.dto.request.GameCodeRequest request,
            SimpMessageHeaderAccessor headerAccessor) {
        Long userId = getUserId(headerAccessor);
        if (userId == null)
            return;
        gameService.updateCode(request, userId);
    }

    // 코드 불러오기
    @MessageMapping("/games/code/load")
    public void loadCode(@Payload com.peekle.domain.game.dto.request.GameCodeRequest request,
            SimpMessageHeaderAccessor headerAccessor) {
        Long userId = getUserId(headerAccessor);
        if (userId == null)
            return;
        gameService.loadCode(request, userId);
    }

    // 코드 제출 알림 (길이 저장용)
    @MessageMapping("/games/submit")
    public void submit(@Payload com.peekle.domain.game.dto.request.GameSubmitRequest request,
            SimpMessageHeaderAccessor headerAccessor) {
        Long userId = getUserId(headerAccessor);
        if (userId == null)
            return;
        gameService.submitCode(request, userId);
    }

    // 강퇴
    @MessageMapping("/games/kick")
    public void kick(@Payload com.peekle.domain.game.dto.request.GameKickRequest request,
            SimpMessageHeaderAccessor headerAccessor) {
        Long userId = getUserId(headerAccessor);
        if (userId == null)
            return;
        gameService.kickParticipant(request.getGameId(), userId, request.getTargetUserId());
    }

    private Long getUserId(SimpMessageHeaderAccessor headerAccessor) {
        Object userIdObj = headerAccessor.getSessionAttributes().get("userId");
        if (userIdObj == null) {
            log.warn("User ID not found in session attributes");
            return null;
        }
        return Long.parseLong(String.valueOf(userIdObj));
    }
}
