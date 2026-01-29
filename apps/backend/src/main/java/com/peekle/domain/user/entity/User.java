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

    @Column(unique = true)
    @Builder.Default
    private String extensionToken = java.util.UUID.randomUUID().toString();

    @Builder.Default
    private java.time.LocalDateTime extensionTokenUpdatedAt = java.time.LocalDateTime.now();


    public User(String socialId, String provider, String nickname) {
        this.socialId = socialId;
        this.provider = provider;
        this.nickname = nickname;
        this.league = LeagueTier.BRONZE;
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
    private LeagueTier league = LeagueTier.BRONZE;

    @Builder.Default
    @Column(name = "league_point")
    private Integer leaguePoint = 0;

    private Long leagueGroupId; // FK (Nullable)

    @Builder.Default
    private Integer streakCurrent = 0;
    @Builder.Default
    private Integer streakMax = 0;

    private String maxLeague;

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
}
