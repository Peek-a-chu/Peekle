package com.peekle.domain.game.controller;

import com.peekle.domain.game.dto.request.GameCreateRequest;
import com.peekle.domain.game.dto.response.GameRoomResponse;
import com.peekle.domain.game.service.RedisGameService;
import com.peekle.domain.submission.dto.SubmissionRequest;
import com.peekle.domain.submission.dto.SubmissionResponse;
import com.peekle.global.dto.ApiResponse; // 공통 응답 DTO 있다고 가정
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
            @RequestHeader(value = "X-User-Id", defaultValue = "1") Long userId) {
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
     * 게임 종료 API (방장/테스트용)
     * 게임을 수동으로 종료하고 포인트를 지급합니다.
     */
    @PostMapping("/{roomId}/end")
    public ApiResponse<String> endGame(@PathVariable Long roomId) {
        gameService.finishGame(roomId);
        return ApiResponse.success("Game ended successfully");
    }

}