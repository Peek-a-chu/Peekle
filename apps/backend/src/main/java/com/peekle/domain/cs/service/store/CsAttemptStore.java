package com.peekle.domain.cs.service.store;

import java.util.Optional;

public interface CsAttemptStore {
    void save(CsAttemptSession session);

    Optional<CsAttemptSession> find(Long userId, Long stageId);

    void delete(Long userId, Long stageId);
}
