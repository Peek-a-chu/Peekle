package com.peekle.domain.user.entity;

import com.peekle.domain.league.enums.LeagueTier;
import com.peekle.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

@Entity
@Getter
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
@Builder
@Table(name = "users")
public class User extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String socialId;

    @Column(nullable = false)
    private String provider; // KAKAO, NAVER, GOOGLE

    @Column(unique = true)
    private String nickname;

    // ... fields ...

    @Column(unique = true)
    private String bojId; // 백준 아이디

    @Column(unique = true, length = 100)
    @Builder.Default
    private String extensionToken = java.util.UUID.randomUUID().toString();

    @Builder.Default
    private java.time.LocalDateTime extensionTokenUpdatedAt = java.time.LocalDateTime.now();

    public User(String socialId, String provider, String nickname) {
        this.socialId = socialId;
        this.provider = provider;
        this.nickname = nickname;
        this.league = LeagueTier.STONE;
        this.leaguePoint = 0;
        this.isDeleted = false;
        this.extensionToken = java.util.UUID.randomUUID().toString();
        this.extensionTokenUpdatedAt = java.time.LocalDateTime.now();
        this.streakCurrent = 0;
        this.streakMax = 0;
    }

    private String profileImg;
    private String profileImgThumb;

    @Builder.Default
    @Column(name = "league")
    @Enumerated(EnumType.STRING)
    private LeagueTier league = LeagueTier.STONE;

    @Builder.Default
    @Column(name = "league_point")
    private Integer leaguePoint = 0;

    private Long leagueGroupId; // FK (Nullable)

    @Builder.Default
    private Integer streakCurrent = 0;
    @Builder.Default
    private Integer streakMax = 0;

    @Enumerated(EnumType.STRING)
    private LeagueTier maxLeague;

    @Builder.Default
    @Column(name = "is_deleted")
    private Boolean isDeleted = false;

    @Column(name = "last_solved_date")
    private java.time.LocalDate lastSolvedDate;

    public void updateStreak(boolean increment) {
        if (increment) {
            this.streakCurrent++;
        } else {
            this.streakCurrent = 1;
        }
        if (this.streakCurrent > this.streakMax) {
            this.streakMax = this.streakCurrent;
        }
        this.lastSolvedDate = java.time.LocalDate.now();
    }

    public void addLeaguePoint(int amount) {
        this.leaguePoint += amount;
    }

    public void registerBojId(String bojId) {
        this.bojId = bojId;
    }

    public void updateExtensionToken(String extensionToken) {
        this.extensionToken = extensionToken;
        this.extensionTokenUpdatedAt = java.time.LocalDateTime.now();
    }

    public void updateLeagueGroup(Long leagueGroupId) {
        this.leagueGroupId = leagueGroupId;
    }

    /**
     * 승급 - 다음 티어로 이동
     */
    public void promoteLeague() {
        this.league = this.league.next();
        if (this.maxLeague == null || this.league.ordinal() > this.maxLeague.ordinal()) {
            this.maxLeague = this.league;
        }
    }

    /**
     * 강등 - 이전 티어로 이동
     */
    public void demoteLeague() {
        this.league = this.league.previous();
    }

    /**
     * 새로운 시즌 시작 시 초기화
     */
    public void resetForNewSeason() {
        this.leaguePoint = 0;
        this.leagueGroupId = null;
    }

    /**
     * 리그 그룹 배정
     */
    public void assignToLeagueGroup(Long leagueGroupId) {
        this.leagueGroupId = leagueGroupId;
    }
}
