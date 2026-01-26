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
        // this.bojId = null; // 기본값 null
        // this.league = LeagueTier.BRONZE; // Field init + Builder.Default
        // this.leaguePoint = 0;
        this.isDeleted = false;
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
