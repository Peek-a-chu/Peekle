package com.peekle.domain.game.dto.response;

import com.peekle.domain.game.enums.GameStatus;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class CurrentGameResponse {
    private Long roomId;
    private GameStatus status;
    private String title;
}
