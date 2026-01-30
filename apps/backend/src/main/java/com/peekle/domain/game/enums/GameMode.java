package com.peekle.domain.game.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum GameMode {
    TIME_ATTACK("타임어택"),
    SPEED_RACE("스피드 레이스");

    private final String description;
}
