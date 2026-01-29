package com.peekle.domain.game.dto.response;

import com.peekle.domain.game.enums.GameMode;
import com.peekle.domain.game.enums.GameStatus;
import com.peekle.domain.game.enums.GameType;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class GameRoomResponse {
    private Long roomId;
    private String title;
    private boolean isSecret;
    private GameStatus status;
    private Integer currentPlayers;
    private Integer maxPlayers;
    private Integer timeLimit;
    private Integer problemCount;
    private GameType teamType;
    private GameMode mode;
}