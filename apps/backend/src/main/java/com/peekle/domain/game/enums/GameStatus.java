package com.peekle.domain.game.enums;

public enum GameStatus {
    WAITING, // 대기중 (방 생성 직후부터 카운트다운 전까지)
    PLAYING, // 게임 진행중
    ENDING, // 종료 처리중 (내부 멱등 종료 선점 상태)
    END, // 게임 종료
}
