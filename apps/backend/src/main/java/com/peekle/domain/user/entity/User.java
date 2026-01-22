package com.peekle.domain.user.entity;

import com.peekle.domain.league.enums.LeagueTier;
import com.peekle.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

@Entity
@Getter
@NoArgsConstructor
@EntityListeners(AuditingEntityListener.class)
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


    public User(String socialId, String provider, String nickname) {
        this.socialId = socialId;
        this.provider = provider;
        this.nickname = nickname;
        // this.bojId = null; // 기본값 null
        this.league = LeagueTier.BRONZE;
        this.leaguePoint = 0;
        this.isDeleted = false;
    }


    private String profileImg;
    private String profileImgThumb;

    @Column(name = "league")
    @Enumerated(EnumType.STRING)
    private LeagueTier league = LeagueTier.BRONZE;

    @Column(name = "league_point")
    private Integer leaguePoint = 0;

    private Long leagueGroupId; // FK (Nullable)

    private Integer streakCurrent = 0;
    private Integer streakMax = 0;

    private String maxLeague;

    @Column(name = "is_deleted")
    private Boolean isDeleted = false;

    public void addLeaguePoint(int amount) {
        this.leaguePoint += amount;
    }

    public void registerBojId(String bojId) {
        this.bojId = bojId;
    }
}
