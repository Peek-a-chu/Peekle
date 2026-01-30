package com.peekle.domain.game.dto.request;

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
    private Integer timeLimit; // 제한시간
    private Integer problemCount;

    private GameType teamType; // Frontend "teamType" -> Backend "teamType"
    private GameMode mode;

    private String problemSource; // "BOJ_RANDOM" or "WORKBOOK"
    private String tierMin; // e.g. "bronze5"
    private String tierMax; // e.g. "gold5"
    private String selectedWorkbookId; // Frontend provided ID (String to match 'wb1' example or generic ID)
}