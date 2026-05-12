package com.peekle.domain.leetcode.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@NoArgsConstructor
@Table(
        name = "leetcode_problem_ratings",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_leetcode_problem_ratings_title_slug",
                columnNames = "title_slug"
        )
)
public class LeetcodeProblemRating {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "problem_number")
    private Integer problemNumber;

    @Column(nullable = false)
    private String title;

    @Column(name = "title_slug", nullable = false)
    private String titleSlug;

    @Column(name = "title_zh")
    private String titleZh;

    @Column(nullable = false)
    private Double rating;

    @Column(name = "contest_slug")
    private String contestSlug;

    @Column(name = "problem_index", length = 20)
    private String problemIndex;

    @Column(name = "contest_id_en")
    private String contestIdEn;

    @Column(name = "contest_id_zh")
    private String contestIdZh;

    public LeetcodeProblemRating(
            Integer problemNumber,
            String title,
            String titleSlug,
            String titleZh,
            Double rating,
            String contestSlug,
            String problemIndex,
            String contestIdEn,
            String contestIdZh
    ) {
        this.problemNumber = problemNumber;
        this.title = title;
        this.titleSlug = titleSlug;
        this.titleZh = titleZh;
        this.rating = rating;
        this.contestSlug = contestSlug;
        this.problemIndex = problemIndex;
        this.contestIdEn = contestIdEn;
        this.contestIdZh = contestIdZh;
    }
}
