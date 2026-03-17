package com.peekle.domain.ai.repository;

import com.peekle.domain.ai.entity.RecommendFeedback;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RecommendFeedbackRepository extends JpaRepository<RecommendFeedback, Long> {
    List<RecommendFeedback> findAllByUserId(Long userId);

    Optional<RecommendFeedback> findByUserId(Long userId);

    void deleteAllByUserId(Long userId);
}
