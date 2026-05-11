package com.peekle.domain.game.service;

import com.peekle.domain.game.entity.GameFinishClaim;
import com.peekle.domain.game.repository.GameFinishClaimRepository;
import com.peekle.global.config.QueryDslConfig;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ActiveProfiles("test")
@Import({GameFinishClaimService.class, QueryDslConfig.class})
class GameFinishClaimServiceTest {

    @Autowired
    private GameFinishClaimService gameFinishClaimService;

    @Autowired
    private GameFinishClaimRepository gameFinishClaimRepository;

    @AfterEach
    void tearDown() {
        gameFinishClaimRepository.deleteAll();
    }

    @Test
    void tryAcquireGrantsOnlyFirstRequesterForRoom() {
        Long roomId = 1001L;

        GameFinishClaimService.FinishClaim first = gameFinishClaimService.tryAcquire(roomId, "manual");
        GameFinishClaimService.FinishClaim second = gameFinishClaimService.tryAcquire(roomId, "scheduler");

        assertThat(first.granted()).isTrue();
        assertThat(second.granted()).isFalse();

        GameFinishClaim claim = gameFinishClaimRepository.findById(roomId).orElseThrow();
        assertThat(claim.getClaimToken()).isEqualTo(first.claimToken());
        assertThat(claim.getTrigger()).isEqualTo("manual");
        assertThat(claim.getStatus()).isEqualTo(GameFinishClaim.Status.PROCESSING);
    }

    @Test
    void concurrentTryAcquireGrantsOnlyOneRequesterForRoom() throws Exception {
        Long roomId = 1004L;
        int requestCount = 12;
        ExecutorService executor = Executors.newFixedThreadPool(requestCount);
        CountDownLatch ready = new CountDownLatch(requestCount);
        CountDownLatch start = new CountDownLatch(1);

        try {
            List<Future<GameFinishClaimService.FinishClaim>> futures = IntStream.range(0, requestCount)
                    .mapToObj(index -> executor.submit(() -> {
                        ready.countDown();
                        assertThat(start.await(2, TimeUnit.SECONDS)).isTrue();
                        return gameFinishClaimService.tryAcquire(roomId, "trigger-" + index);
                    }))
                    .toList();

            assertThat(ready.await(2, TimeUnit.SECONDS)).isTrue();
            start.countDown();

            List<GameFinishClaimService.FinishClaim> claims = futures.stream()
                    .map(future -> {
                        try {
                            return future.get(3, TimeUnit.SECONDS);
                        } catch (Exception e) {
                            throw new AssertionError(e);
                        }
                    })
                    .toList();

            long grantedCount = claims.stream()
                    .filter(GameFinishClaimService.FinishClaim::granted)
                    .count();
            String grantedToken = claims.stream()
                    .filter(GameFinishClaimService.FinishClaim::granted)
                    .findFirst()
                    .orElseThrow()
                    .claimToken();

            assertThat(grantedCount).isEqualTo(1);
            GameFinishClaim claim = gameFinishClaimRepository.findById(roomId).orElseThrow();
            assertThat(claim.getClaimToken()).isEqualTo(grantedToken);
            assertThat(claim.getStatus()).isEqualTo(GameFinishClaim.Status.PROCESSING);
        } finally {
            executor.shutdownNow();
        }
    }

    @Test
    void rollbackReleasesProcessingClaimForRetry() {
        Long roomId = 1002L;

        GameFinishClaimService.FinishClaim first = gameFinishClaimService.tryAcquire(roomId, "manual");
        boolean rolledBack = gameFinishClaimService.rollback(roomId, first.claimToken());
        GameFinishClaimService.FinishClaim retry = gameFinishClaimService.tryAcquire(roomId, "scheduler");

        assertThat(rolledBack).isTrue();
        assertThat(retry.granted()).isTrue();
        assertThat(retry.claimToken()).isNotEqualTo(first.claimToken());
    }

    @Test
    void completedClaimRejectsRetry() {
        Long roomId = 1003L;

        GameFinishClaimService.FinishClaim first = gameFinishClaimService.tryAcquire(roomId, "manual");
        gameFinishClaimService.markCompleted(roomId, first.claimToken());

        GameFinishClaimService.FinishClaim retry = gameFinishClaimService.tryAcquire(roomId, "scheduler");

        assertThat(retry.granted()).isFalse();
        GameFinishClaim claim = gameFinishClaimRepository.findById(roomId).orElseThrow();
        assertThat(claim.getStatus()).isEqualTo(GameFinishClaim.Status.COMPLETED);
        assertThat(claim.getCompletedAt()).isNotNull();
    }
}
