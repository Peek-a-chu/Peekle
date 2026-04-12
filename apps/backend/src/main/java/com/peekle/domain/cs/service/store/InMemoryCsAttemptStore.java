package com.peekle.domain.cs.service.store;

import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

@Component
@Profile("test")
public class InMemoryCsAttemptStore implements CsAttemptStore {

    private final ConcurrentMap<String, CsAttemptSession> storage = new ConcurrentHashMap<>();

    @Override
    public void save(CsAttemptSession session) {
        storage.put(key(session.getUserId(), session.getStageId()), session);
    }

    @Override
    public Optional<CsAttemptSession> find(Long userId, Long stageId) {
        return Optional.ofNullable(storage.get(key(userId, stageId)));
    }

    @Override
    public void delete(Long userId, Long stageId) {
        storage.remove(key(userId, stageId));
    }

    private String key(Long userId, Long stageId) {
        return userId + ":" + stageId;
    }
}
