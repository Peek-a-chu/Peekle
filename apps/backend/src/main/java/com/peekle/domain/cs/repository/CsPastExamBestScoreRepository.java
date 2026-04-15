package com.peekle.domain.cs.repository;

import com.peekle.domain.cs.entity.CsPastExamBestScore;
import com.peekle.domain.cs.entity.CsPastExamBestScoreId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CsPastExamBestScoreRepository extends JpaRepository<CsPastExamBestScore, CsPastExamBestScoreId> {
    Optional<CsPastExamBestScore> findByUser_IdAndExamYearAndExamRound(Long userId, Short examYear, Short examRound);
}
