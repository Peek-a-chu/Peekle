package com.peekle.domain.game.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum GameMode {
    INDIVIDUAL("개인전"),
    TEAM("팀전");

    private final String description;
}
