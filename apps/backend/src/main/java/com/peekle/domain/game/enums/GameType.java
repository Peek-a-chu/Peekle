package com.peekle.domain.game.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum GameType {
    TIME_ATTACK("타임어택"),
    SPEED("스피드");

    private final String description;
}
