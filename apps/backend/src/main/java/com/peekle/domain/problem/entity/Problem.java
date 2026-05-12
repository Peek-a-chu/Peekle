package com.peekle.domain.problem.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
// import Tag removed (same package)
import java.util.HashSet;
import java.util.Set;

@Entity
@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Table(
        name = "problems",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_problems_source_external_id",
                columnNames = { "source", "external_id" }
        )
)
public class Problem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String source; // BOJ, SWEA

    @Column(name = "external_id", nullable = false)
    private String externalId; // 1000

    @Column(nullable = false)
    private String title;

    @Column(name = "english_title")
    private String englishTitle;

    @Column(nullable = false)
    private String tier; // 표시용 난이도: Gold 5, Easy, Medium, Hard, Unrated

    @Column(name = "leetcode_rating")
    private Double leetcodeRating;

    @Column(name = "difficulty_source", length = 50)
    private String difficultySource;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String url;

    @Builder.Default
    @Column(name = "accepted_user_count", nullable = false)
    private Integer acceptedUserCount = 0;

    @Builder.Default
    @Column(name = "level", nullable = false)
    private Integer level = 0;

    @Builder.Default
    @Column(name = "language", nullable = false, length = 5)
    private String language = "ko";

    @Builder.Default
    @ManyToMany(cascade = { CascadeType.PERSIST, CascadeType.MERGE })
    @JoinTable(name = "problem_tags", joinColumns = @JoinColumn(name = "problem_id"), inverseJoinColumns = @JoinColumn(name = "tag_id"))
    private Set<Tag> tags = new HashSet<>();

    public Problem(String source, String externalId, String title, String tier, String url) {
        this.source = source;
        this.externalId = externalId;
        this.title = title;
        this.tier = tier;
        this.url = url;
        this.difficultySource = "BOJ".equalsIgnoreCase(source) ? "SOLVED_AC" : null;
        this.acceptedUserCount = 0;
        this.level = 0;
        this.language = "ko";
        this.tags = new HashSet<>();
    }

    // 태그 추가 편의 메서드
    public void addTag(Tag tag) {
        this.tags.add(tag);
    }
}
