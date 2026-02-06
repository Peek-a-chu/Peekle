package com.peekle.domain.league.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum LeagueTier {
    STONE(30, 0),
    BRONZE(30, 20),
    SILVER(30, 30),
    GOLD(30, 30),
    PLATINUM(20, 30),
    EMERALD(20, 30),
    DIAMOND(10, 30),
    RUBY(0, 30);

    private final int promotePercent; // 승급 비율 (%)
    private final int demotePercent;  // 강등 비율 (%)

    public LeagueTier next() {
        if (this == RUBY) return RUBY;
        return values()[this.ordinal() + 1];
    }

    public LeagueTier previous() {
        if (this == STONE) return STONE;
        return values()[this.ordinal() - 1];
    }
}
