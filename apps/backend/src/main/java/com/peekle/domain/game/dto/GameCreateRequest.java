package com.peekle.domain.game.dto;

import com.peekle.domain.game.enums.GameMode;
import com.peekle.domain.game.enums.GameType;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class GameCreateRequest {
    @NotBlank
    private String title;
    private String password; // 비어있으면 공개방
    private Integer maxPlayers;
    private Integer timeLimit; // 초 단위
    private Integer problemCount;
    private GameMode mode;
    private GameType type;
}