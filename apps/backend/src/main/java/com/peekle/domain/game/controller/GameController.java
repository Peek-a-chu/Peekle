package com.peekle.domain.game.controller;

import com.peekle.domain.game.dto.request.GameCreateRequest;
import com.peekle.domain.game.dto.request.GameEnterRequest;
import com.peekle.domain.game.dto.request.GameKickRequest;
import com.peekle.domain.game.dto.response.GameRoomResponse;
import com.peekle.domain.game.service.RedisGameService;
import com.peekle.global.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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
        return ApiResponse.success(gameService.getGameRoom(roomId));
    }

    /**
     * 방 입장 API
     */
    @PostMapping("/{roomId}/enter")
    public ApiResponse<Void> enterRoom(@PathVariable Long roomId,
            @RequestBody(required = false) GameEnterRequest request,
            @org.springframework.security.core.annotation.AuthenticationPrincipal Long userId) {
        String password = request != null ? request.getPassword() : null;
        gameService.enterGameRoom(roomId, userId, password);
        return ApiResponse.success(null);
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

}