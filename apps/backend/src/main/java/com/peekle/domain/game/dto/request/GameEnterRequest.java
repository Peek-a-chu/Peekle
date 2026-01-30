package com.peekle.domain.game.dto.request;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class GameEnterRequest extends GameCommonRequest {
    private String password; // 비번방일 경우
}
