package com.peekle.domain.game.dto.request;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class GameCommonRequest {
    private Long gameId;
    private Boolean isReady;
}
