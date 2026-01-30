package com.peekle.domain.league.entity;

import com.peekle.domain.league.enums.LeagueTier;
import com.peekle.domain.user.entity.User;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "league_history")
public class LeagueHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private LeagueTier league;

    @Column(name = "final_point", nullable = false)
    private Integer finalPoint;

    @Column(nullable = false)
    private String result; // PROMOTED, DEMOTED, STAY

    @Column(name = "season_week", nullable = false)
    private Integer seasonWeek; // YYYYWW

    @Column(name = "closed_at", nullable = false)
    private LocalDateTime closedAt;

    @Column(name = "is_viewed", nullable = false)
    @Builder.Default
    private Boolean isViewed = false;
}
