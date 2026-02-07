package com.peekle.domain.game.controller;

import com.peekle.domain.game.dto.request.GameCreateRequest;
import com.peekle.domain.game.dto.request.GameEnterRequest;
import com.peekle.domain.game.dto.request.GameKickRequest;
import com.peekle.domain.game.dto.response.GameInviteCodeResponse;
import com.peekle.domain.game.dto.response.GameRoomResponse;
import com.peekle.domain.game.service.RedisGameService;
import com.peekle.global.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/games")
@RequiredArgsConstructor
public class GameController {

    private final RedisGameService gameService;

    @PostMapping
    public ApiResponse<Long> createRoom(@RequestBody GameCreateRequest request,
            @org.springframework.security.core.annotation.AuthenticationPrincipal Long userId) {
        Long roomId = gameService.createGameRoom(request, userId);
        return ApiResponse.success(roomId);
    }

    @GetMapping
    public ApiResponse<List<GameRoomResponse>> getRooms() {

        return ApiResponse.success(gameService.getAllGameRooms());
    }

    @GetMapping("/{roomId}")
    public ApiResponse<GameRoomResponse> getRoom(@PathVariable Long roomId) {
        GameRoomResponse response = gameService.getGameRoom(roomId);
        log.info("📤 [Get Room Response] workbookTitle: {}", response.getWorkbookTitle());
        return ApiResponse.success(response);
    }

    /**
     * 방 입장 API
     */
    @PostMapping("/{roomId}/enter")
    public ApiResponse<GameRoomResponse> enterRoom(@PathVariable Long roomId,
            @RequestBody(required = false) GameEnterRequest request,
            @org.springframework.security.core.annotation.AuthenticationPrincipal Long userId) {
        String password = request != null ? request.getPassword() : null;
        gameService.enterGameRoom(roomId, userId, password);
        // 입장 후 방 정보 반환
        GameRoomResponse roomInfo = gameService.getGameRoom(roomId);
        log.info("📥 [Enter Room] Returning room info with workbookTitle: {}", roomInfo.getWorkbookTitle());
        return ApiResponse.success(roomInfo);
    }

    /**
     * 유저 강퇴 API (방장 전용)
     */
    @PostMapping("/{roomId}/kick")
    public ApiResponse<Void> kickUser(@PathVariable Long roomId,
            @RequestBody GameKickRequest request,
            @org.springframework.security.core.annotation.AuthenticationPrincipal Long hostId) {
        gameService.kickParticipant(roomId, hostId, request.getTargetUserId());
        return ApiResponse.success(null);
    }

    /**
     * 게임 종료 API (방장/테스트용)
     * 게임을 수동으로 종료하고 포인트를 지급합니다.
     */
    @PostMapping("/{roomId}/end")
    public ApiResponse<String> endGame(@PathVariable Long roomId) {
        gameService.finishGame(roomId);
        return ApiResponse.success("Game ended successfully");
    }

    /**
     * 초대 코드 생성 API
     */
    @PostMapping("/{roomId}/invite-code")
    public ApiResponse<GameInviteCodeResponse> createInviteCode(@PathVariable Long roomId) {
        String code = gameService.generateInviteCode(roomId);
        return ApiResponse.success(GameInviteCodeResponse.of(code));
    }

    /**
     * 초대 코드로 방 정보 조회 API
     */
    @GetMapping("/invite/{code}")
    public ApiResponse<GameRoomResponse> getRoomByCode(@PathVariable String code) {
        Long roomId = gameService.getRoomIdByInviteCode(code);
        if (roomId == null) {
            return ApiResponse.success(null);
        }
        return ApiResponse.success(gameService.getGameRoom(roomId));
    }

    /**
     * 현재 유저의 진행중인 게임 조회 API
     * 재접속 모달을 위한 엔드포인트
     */
    @GetMapping("/current")
    public ApiResponse<com.peekle.domain.game.dto.response.CurrentGameResponse> getCurrentGame(
            @org.springframework.security.core.annotation.AuthenticationPrincipal Long userId) {
        return ApiResponse.success(gameService.getUserCurrentGame(userId));
    }

}