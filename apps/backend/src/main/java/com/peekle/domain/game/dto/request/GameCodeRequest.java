package com.peekle.domain.game.dto.request;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.ToString;

@Getter
@ToString
@NoArgsConstructor
public class GameCodeRequest {
    private Long gameId;
    private Long problemId;
    private String language;
    private String code; // 코드 저장 시에만 사용
}
