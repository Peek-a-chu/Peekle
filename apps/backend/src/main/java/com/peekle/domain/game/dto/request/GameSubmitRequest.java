package com.peekle.domain.game.dto.request;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class GameSubmitRequest {
    private Long gameId;
    private Long problemId;
    private String code;
    private String language;
}
