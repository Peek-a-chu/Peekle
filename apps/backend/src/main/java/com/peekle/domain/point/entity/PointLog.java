package com.peekle.domain.point.entity;

import com.peekle.domain.point.enums.PointCategory;
import com.peekle.domain.user.entity.User;
import com.peekle.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

@Entity
@Getter
@NoArgsConstructor
@EntityListeners(AuditingEntityListener.class)
@Table(name = "point_logs")
public class PointLog extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private PointCategory category; // PROBLEM | GAME

    @Column(nullable = false)
    private Integer amount;

    private String description;

    @Column(columnDefinition = "TEXT")
    private String metadata; // JSON Data

    public PointLog(User user, PointCategory category, Integer amount, String description) {
        this(user, category, amount, description, null);
    }

    public PointLog(User user, PointCategory category, Integer amount, String description, String metadata) {
        this.user = user;
        this.category = category;
        this.amount = amount;
        this.description = description;
        this.metadata = metadata;
    }
}
