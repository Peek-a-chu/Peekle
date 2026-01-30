package com.peekle.domain.game.dto.request;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class GameKickRequest extends GameCommonRequest {
    private Long targetUserId;
}
