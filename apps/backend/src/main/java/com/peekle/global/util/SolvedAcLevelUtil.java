package com.peekle.global.util;

public class SolvedAcLevelUtil {

    public static String convertLevelToTier(int level) {
        if (level == 0) return "Unrated";

        String[] ranks = {"Bronze", "Silver", "Gold", "Platinum", "Diamond", "Ruby"};

        // 1~5: Bronze (1=B5, 2=B4, 3=B3, 4=B2, 5=B1)
        // 6~10: Silver
        // ...

        int rankIndex = (level - 1) / 5;
        if (rankIndex >= ranks.length) return "Unknown";

        String rank = ranks[rankIndex];
        int step = 5 - ((level - 1) % 5); // 1->5, 2->4, 3->3, 4->2, 5->1

        return rank + " " + step;
    }

    public static int calculatePoints(int level) {
        if (level == 0) return 0;
        // Scale level (1~30) to points (10~50)
        // Formula: 10 + (level - 1) * (50 - 10) / (30 - 1)
        return Math.round(10 + (level - 1) * 40 / 29.0f);
    }

    public static int getPointFromTier(String tier) {
        if (tier == null || tier.equals("Unrated") || tier.equals("Unknown")) return 0;

        try {
            // Format: "Bronze 5", "Gold 1" etc.
            String[] parts = tier.split(" ");
            if (parts.length < 2) return 0;

            String rank = parts[0];
            int step = Integer.parseInt(parts[1]); // 5, 4, 3, 2, 1

            int base = 0;
            switch(rank) {
                case "Bronze": base = 0; break;
                case "Silver": base = 5; break;
                case "Gold": base = 10; break;
                case "Platinum": base = 15; break;
                case "Diamond": base = 20; break;
                case "Ruby": base = 25; break;
                default: return 0;
            }

            // Level calculation:
            // Bronze 5 -> 1 (base 0 + (6-5))
            // Bronze 1 -> 5 (base 0 + (6-1))
            // Silver 5 -> 6 (base 5 + (6-5))
            int level = base + (6 - step);

            return calculatePoints(level);
        } catch (Exception e) {
            return 0;
        }
    }
}
