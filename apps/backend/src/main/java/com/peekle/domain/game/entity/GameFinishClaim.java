package com.peekle.domain.game.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PostLoad;
import jakarta.persistence.PostPersist;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.domain.Persistable;

import java.time.LocalDateTime;

@Entity
@Getter
@Table(name = "game_finish_claims")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class GameFinishClaim implements Persistable<Long> {

    public enum Status {
        PROCESSING,
        COMPLETED
    }

    @Id
    @Column(name = "room_id", nullable = false)
    private Long roomId;

    @Column(name = "claim_token", nullable = false, length = 120)
    private String claimToken;

    @Column(name = "trigger_name", nullable = false, length = 40)
    private String trigger;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Status status;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Transient
    private boolean isNew = true;

    private GameFinishClaim(Long roomId, String claimToken, String trigger) {
        this.roomId = roomId;
        this.claimToken = claimToken;
        this.trigger = trigger;
        this.status = Status.PROCESSING;
    }

    public static GameFinishClaim processing(Long roomId, String claimToken, String trigger) {
        return new GameFinishClaim(roomId, claimToken, trigger);
    }

    @Override
    public Long getId() {
        return roomId;
    }

    @Override
    public boolean isNew() {
        return isNew;
    }

    public boolean isOwnedBy(String claimToken) {
        return this.claimToken != null && this.claimToken.equals(claimToken);
    }

    public boolean isProcessing() {
        return this.status == Status.PROCESSING;
    }

    public void markCompleted() {
        this.status = Status.COMPLETED;
        this.completedAt = LocalDateTime.now();
    }

    @PrePersist
    public void prePersist() {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) {
            createdAt = now;
        }
        if (updatedAt == null) {
            updatedAt = now;
        }
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();
    }

    @PostLoad
    @PostPersist
    public void markNotNew() {
        isNew = false;
    }
}
