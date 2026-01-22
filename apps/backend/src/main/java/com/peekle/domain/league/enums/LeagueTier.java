package com.peekle.domain.league.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum LeagueTier {
    STONE(4, 0),
    BRONZE(4, 2),
    SILVER(3, 3),
    GOLD(3, 3),
    PLATINUM(2, 4),
    EMERALD(2, 4),
    DIAMOND(1, 5),
    RUBY(0, 5);

    private final int promotionCount; // 승급 인원
    private final int demotionCount;  // 강등 인원

    public LeagueTier next() {
        if (this == RUBY) return RUBY;
        return values()[this.ordinal() + 1];
    }

    public LeagueTier previous() {
        if (this == STONE) return STONE;
        return values()[this.ordinal() - 1];
    }
}
