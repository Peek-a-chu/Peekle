package com.peekle.domain.game.dto.request;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class GameReadyRequest extends GameCommonRequest {
    private Boolean isReady;
}
