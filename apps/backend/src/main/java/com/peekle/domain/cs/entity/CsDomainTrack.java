package com.peekle.domain.cs.entity;

import com.peekle.domain.cs.enums.CsTrackLearningMode;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(
        name = "cs_domain_tracks",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_cs_domain_tracks_domain_track_no",
                        columnNames = { "domain_id", "track_no" })
        })
public class CsDomainTrack {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "domain_id", nullable = false)
    private CsDomain domain;

    @Column(name = "track_no", nullable = false)
    private Short trackNo;

    @Column(nullable = false, length = 150)
    private String name;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "learning_mode", nullable = false, length = 20)
    private CsTrackLearningMode learningMode = CsTrackLearningMode.CURRICULUM;

    @Column(name = "exam_year")
    private Short examYear;

    public void rename(String name) {
        this.name = name;
    }

    public void updateTrackNo(short trackNo) {
        this.trackNo = trackNo;
    }

    public void updateLearningMode(CsTrackLearningMode learningMode, Short examYear) {
        this.learningMode = learningMode;
        this.examYear = examYear;
    }
}
