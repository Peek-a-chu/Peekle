package com.peekle.domain.user.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Getter
@NoArgsConstructor
@EntityListeners(AuditingEntityListener.class)
@Table(name = "users")
public class User {

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
        this.league = "브론즈";
        this.leaguePoint = 0;
        this.isDeleted = false;
        this.createdAt = LocalDateTime.now();
    }


    private String profileImg;
    private String profileImgThumb;

    @Column(name = "league")
    private String league = "BRONZE";

    @Column(name = "league_point")
    private Integer leaguePoint = 0;

    private Long leagueGroupId; // FK (Nullable)

    private Integer streakCurrent = 0;
    private Integer streakMax = 0;

    private String maxLeague;

    @Column(name = "is_deleted")
    private Boolean isDeleted = false;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public void addLeaguePoint(int amount) {
        this.leaguePoint += amount;
    }

    public void registerBojId(String bojId) {
        this.bojId = bojId;
    }
}
