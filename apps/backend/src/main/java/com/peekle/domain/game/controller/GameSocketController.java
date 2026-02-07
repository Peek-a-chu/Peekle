package com.peekle.domain.game.controller;

import com.peekle.domain.game.dto.request.GameChatRequest;
import com.peekle.domain.game.dto.request.GameCommonRequest;
import com.peekle.domain.game.dto.request.GameEnterRequest;
import com.peekle.domain.game.dto.request.GameTeamRequest;
import com.peekle.domain.game.service.RedisGameAfterService;
import com.peekle.domain.game.service.RedisGameService;
import com.peekle.domain.user.entity.User;
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
    private final RedisGameAfterService gameAfterService;

    // 방 입장
    @MessageMapping("/games/enter")
    public void enter(@Payload GameEnterRequest request,
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
                    .map(User::getNickname)
                    .orElse("Player " + userId);

            // 팀전 여부 확인 및 팀별 방 분리
            String teamType = gameService.getTeamType(request.getGameId());
            String roomSuffix = null;
            if ("TEAM".equals(teamType)) {
                roomSuffix = gameService.getUserTeam(request.getGameId(), userId);
                log.info("Team Mode Detected. Assigning User {} to Video Room Suffix: {}", userId, roomSuffix);
            }

            String token = mediaService.createGameAccessToken(request.getGameId(), userId, nickname, roomSuffix);
            log.info("Generated LiveKit token for user {}, game {} (Suffix: {})", userId, request.getGameId(),
                    roomSuffix);

            messagingTemplate.convertAndSend(
                    "/topic/games/" + request.getGameId() + "/video-token/" + userId,
                    SocketResponse.of("VIDEO_TOKEN", token));
        } catch (Exception e) {
            log.error("LiveKit token generation failed for game {}: {}", request.getGameId(), e.getMessage());
            messagingTemplate.convertAndSend(
                    "/topic/games/" + request.getGameId() + "/video-token/" + userId,
                    SocketResponse.of("ERROR", "Video connection failed"));
        }

        // [New] Add to online users list
        gameAfterService.addOnlineUser(request.getGameId(), userId);

        // [New] Broadcast updated online user list
        gameAfterService.broadcastOnlineUsers(request.getGameId());
    }

    // 팀 변경
    @MessageMapping("/games/team")
    public void changeTeam(@Payload GameTeamRequest request,
            SimpMessageHeaderAccessor headerAccessor) {
        Long userId = getUserId(headerAccessor);
        if (userId == null)
            return;
        try {
            gameService.changeTeam(request.getGameId(), userId, request.getTeam());
        } catch (Exception e) {
            log.error("Failed to change team: {}", e.getMessage());
            sendError(userId, request.getGameId(), e.getMessage());
        }
    }

    // 방 퇴장
    @MessageMapping("/games/leave")
    public void leave(@Payload GameCommonRequest request, SimpMessageHeaderAccessor headerAccessor) {
        Long userId = getUserId(headerAccessor);
        if (userId == null)
            return;
        try {
            gameService.exitGameRoom(request.getGameId(), userId);
        } catch (Exception e) {
            log.error("Failed to leave game: {}", e.getMessage());
            sendError(userId, request.getGameId(), e.getMessage());
        }
    }

    // 준비
    @MessageMapping("/games/ready")
    public void ready(@Payload GameCommonRequest request, SimpMessageHeaderAccessor headerAccessor) {
        Long userId = getUserId(headerAccessor);
        if (userId == null)
            return;
        try {
            gameService.toggleReady(request.getGameId(), userId);
        } catch (Exception e) {
            log.error("Failed to toggle ready: {}", e.getMessage());
            sendError(userId, request.getGameId(), e.getMessage());
        }
    }

    // 게임 시작
    @MessageMapping("/games/start")
    public void start(@Payload GameCommonRequest request, SimpMessageHeaderAccessor headerAccessor) {
        Long userId = getUserId(headerAccessor);
        if (userId == null)
            return;
        try {
            gameService.startGame(request.getGameId(), userId);
        } catch (Exception e) {
            log.error("Failed to start game {}: {}", request.getGameId(), e.getMessage());
            sendError(userId, request.getGameId(), e.getMessage());
        }
    }

    // 채팅
    @MessageMapping("/games/chat")
    public void chat(@Payload GameChatRequest request, SimpMessageHeaderAccessor headerAccessor) {
        Long userId = getUserId(headerAccessor);
        if (userId == null)
            return;
        try {
            gameService.sendChatMessage(request, userId);
        } catch (Exception e) {
            log.error("Failed to send chat: {}", e.getMessage());
            sendError(userId, request.getGameId(), e.getMessage());
        }
    }

    // 코드 저장
    @MessageMapping("/games/code/update")
    public void updateCode(@Payload com.peekle.domain.game.dto.request.GameCodeRequest request,
            SimpMessageHeaderAccessor headerAccessor) {
        Long userId = getUserId(headerAccessor);
        if (userId == null)
            return;
        try {
            gameService.updateCode(request, userId);
        } catch (Exception e) {
            log.error("Failed to update code: {}", e.getMessage());
            // 코드는 너무 빈번하므로 에러 전송 생략 가능하나 일단 로그만
        }
    }

    // 코드 불러오기
    @MessageMapping("/games/code/load")
    public void loadCode(@Payload com.peekle.domain.game.dto.request.GameCodeRequest request,
            SimpMessageHeaderAccessor headerAccessor) {
        Long userId = getUserId(headerAccessor);
        if (userId == null)
            return;
        try {
            gameService.loadCode(request, userId);
        } catch (Exception e) {
            log.error("Failed to load code: {}", e.getMessage());
            sendError(userId, request.getGameId(), e.getMessage());
        }
    }

    // 코드 제출 알림 (길이 저장용)
    @MessageMapping("/games/submit")
    public void submit(@Payload com.peekle.domain.game.dto.request.GameSubmitRequest request,
            SimpMessageHeaderAccessor headerAccessor) {
        Long userId = getUserId(headerAccessor);
        if (userId == null)
            return;
        try {
            gameService.submitCode(request, userId);
        } catch (Exception e) {
            log.error("Failed to submit code: {}", e.getMessage());
            sendError(userId, request.getGameId(), e.getMessage());
        }
    }

    // 강퇴
    @MessageMapping("/games/kick")
    public void kick(@Payload com.peekle.domain.game.dto.request.GameKickRequest request,
            SimpMessageHeaderAccessor headerAccessor) {
        Long userId = getUserId(headerAccessor);
        if (userId == null)
            return;
        try {
            gameService.kickParticipant(request.getGameId(), userId, request.getTargetUserId());
        } catch (Exception e) {
            log.error("Failed to kick user: {}", e.getMessage());
            sendError(userId, request.getGameId(), e.getMessage());
        }
    }

    // 게임 포기
    @MessageMapping("/games/forfeit")
    public void forfeit(@Payload GameCommonRequest request, SimpMessageHeaderAccessor headerAccessor) {
        Long userId = getUserId(headerAccessor);
        if (userId == null)
            return;
        try {
            gameService.forfeitGameRoom(request.getGameId(), userId);
        } catch (Exception e) {
            log.error("Failed to forfeit game: {}", e.getMessage());
            sendError(userId, request.getGameId(), e.getMessage());
        }
    }

    // [New] 온라인 유저 목록 요청
    @MessageMapping("/games/connected-users")
    public void getConnectedUsers(@Payload GameCommonRequest request, SimpMessageHeaderAccessor headerAccessor) {
        Long userId = getUserId(headerAccessor);
        if (userId == null)
            return;

        // 요청한 시점의 상태를 브로드캐스트 (모두에게 최신화)
        gameAfterService.broadcastOnlineUsers(request.getGameId());
    }

    private Long getUserId(SimpMessageHeaderAccessor headerAccessor) {
        Object userIdObj = headerAccessor.getSessionAttributes().get("userId");
        if (userIdObj == null) {
            log.warn("User ID not found in session attributes");
            return null;
        }
        return Long.parseLong(String.valueOf(userIdObj));
    }

    private void sendError(Long userId, Long gameId, String message) {
        if (userId != null && gameId != null) {
            messagingTemplate.convertAndSend(
                    "/topic/games/" + gameId + "/error/" + userId,
                    SocketResponse.of("ERROR", message));
        }
    }
}
