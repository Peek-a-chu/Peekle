package com.peekle.domain.problem.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@NoArgsConstructor
@Table(name = "tags")
public class Tag {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false, name = "tag_key")
    private String key; // math, dp, implementation (Solved.ac key)

    @Column(nullable = false)
    private String name; // 수학, 다이나믹 프로그래밍 (한글)

    public Tag(String key, String name) {
        this.key = key;
        this.name = name;
    }
}
