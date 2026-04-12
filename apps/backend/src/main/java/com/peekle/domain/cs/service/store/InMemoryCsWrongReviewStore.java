package com.peekle.domain.cs.service.store;

import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

@Component
@Profile("test")
public class InMemoryCsWrongReviewStore implements CsWrongReviewStore {

    private final ConcurrentMap<String, CsWrongReviewSession> storage = new ConcurrentHashMap<>();

    @Override
    public void save(CsWrongReviewSession session) {
        storage.put(key(session.getUserId(), session.getReviewId()), session);
    }

    @Override
    public Optional<CsWrongReviewSession> find(Long userId, String reviewId) {
        return Optional.ofNullable(storage.get(key(userId, reviewId)));
    }

    @Override
    public void delete(Long userId, String reviewId) {
        storage.remove(key(userId, reviewId));
    }

    private String key(Long userId, String reviewId) {
        return userId + ":" + reviewId;
    }
}
