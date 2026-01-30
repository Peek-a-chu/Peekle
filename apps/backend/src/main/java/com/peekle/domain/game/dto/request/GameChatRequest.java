package com.peekle.domain.game.dto.request;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class GameChatRequest {
    private Long gameId;
    private String message;
    private String scope; // GLOBAL / TEAM
    private String teamColor; // RED / BLUD (개인전은 null)
}
