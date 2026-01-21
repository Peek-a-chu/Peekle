package com.peekle.domain.problem.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@NoArgsConstructor
@Table(name = "problem")
public class Problem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String source; // BOJ, SWEA

    @Column(unique = true, nullable = false)
    private String externalId; // 1000

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private String tier; // Gold 5

    @Column(columnDefinition = "TEXT", nullable = false)
    private String url;

    // 생성자 등 필요시 추가
    public Problem(String source, String externalId, String title, String tier, String url) {
        this.source = source;
        this.externalId = externalId;
        this.title = title;
        this.tier = tier;
        this.url = url;
    }
}
