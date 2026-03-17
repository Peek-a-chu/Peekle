package com.peekle.domain.ai.entity;

import com.peekle.domain.problem.entity.Problem;
import com.peekle.domain.user.entity.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "recommend_problems")
public class RecommendProblem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "problem_id", nullable = false)
    private Problem problem;

    @Column(columnDefinition = "TEXT")
    private String reason;

    @Column(name = "order_index", nullable = false)
    private Integer orderIndex;

    @Builder.Default
    @Column(nullable = false)
    private Boolean solved = false;

    public static RecommendProblem create(User user, Problem problem, String reason, int orderIndex) {
        return RecommendProblem.builder()
                .user(user)
                .problem(problem)
                .reason(reason)
                .orderIndex(orderIndex)
                .solved(false)
                .build();
    }

    public void updateRecommendation(Problem problem, String reason, int orderIndex) {
        this.problem = problem;
        this.reason = reason;
        this.orderIndex = orderIndex;
        this.solved = false;
    }
}
