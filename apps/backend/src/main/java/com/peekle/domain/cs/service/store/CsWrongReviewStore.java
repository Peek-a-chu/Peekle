package com.peekle.domain.cs.service.store;

import java.util.Optional;

public interface CsWrongReviewStore {
    void save(CsWrongReviewSession session);

    Optional<CsWrongReviewSession> find(Long userId, String reviewId);

    void delete(Long userId, String reviewId);
}
