package com.peekle.domain.game.controller;

import com.peekle.domain.game.dto.GameCreateRequest;
import com.peekle.domain.game.dto.GameRoomResponse;
import com.peekle.domain.game.service.RedisGameService;
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
    public ApiResponse<Long> createRoom(@RequestBody GameCreateRequest request) {
        Long roomId = gameService.createGameRoom(request);
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
}