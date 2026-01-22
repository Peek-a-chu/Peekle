package com.peekle.domain.point.entity;

import com.peekle.domain.user.entity.User;
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
@Table(name = "point_logs")
public class PointLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private String category; // PROBLEM | GAME

    @Column(nullable = false)
    private Integer amount;

    private String description;

    @Column(columnDefinition = "TEXT")
    private String metadata; // JSON Data

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public PointLog(User user, String category, Integer amount, String description) {
        this.user = user;
        this.category = category;
        this.amount = amount;
        this.description = description;
    }
}
