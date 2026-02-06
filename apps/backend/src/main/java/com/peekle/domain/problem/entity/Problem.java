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
@Table(name = "problems")
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

    @ManyToMany(cascade = { CascadeType.PERSIST, CascadeType.MERGE })
    @JoinTable(name = "problem_tags", joinColumns = @JoinColumn(name = "problem_id"), inverseJoinColumns = @JoinColumn(name = "tag_id"))
    private Set<Tag> tags = new HashSet<>();

    public Problem(String source, String externalId, String title, String tier, String url) {
        this.source = source;
        this.externalId = externalId;
        this.title = title;
        this.tier = tier;
        this.url = url;
    }

    // 태그 추가 편의 메서드
    public void addTag(Tag tag) {
        this.tags.add(tag);
    }
}
