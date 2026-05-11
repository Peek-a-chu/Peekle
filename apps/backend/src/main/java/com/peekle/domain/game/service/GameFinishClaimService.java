package com.peekle.domain.game.service;

import com.peekle.domain.game.entity.GameFinishClaim;
import com.peekle.domain.game.repository.GameFinishClaimRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.PessimisticLockingFailureException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.Locale;
import java.util.UUID;

@Slf4j
@Service
public class GameFinishClaimService {

    private final GameFinishClaimRepository gameFinishClaimRepository;
    private final TransactionTemplate transactionTemplate;

    public GameFinishClaimService(
            GameFinishClaimRepository gameFinishClaimRepository,
            PlatformTransactionManager transactionManager) {
        this.gameFinishClaimRepository = gameFinishClaimRepository;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
        this.transactionTemplate.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    public FinishClaim tryAcquire(Long roomId, String trigger) {
        String normalizedTrigger = normalizeTrigger(trigger);
        String claimToken = normalizedTrigger + ":" + UUID.randomUUID();

        try {
            Boolean granted = transactionTemplate.execute(status -> {
                gameFinishClaimRepository.saveAndFlush(
                        GameFinishClaim.processing(roomId, claimToken, normalizedTrigger));
                return true;
            });

            if (Boolean.TRUE.equals(granted)) {
                return FinishClaim.granted(claimToken);
            }
            return FinishClaim.rejected(claimToken);
        } catch (DataIntegrityViolationException | PessimisticLockingFailureException e) {
            lockExistingClaim(roomId);
            log.info("Finish claim rejected by DB for room {} (trigger: {})", roomId, normalizedTrigger);
            return FinishClaim.rejected(claimToken);
        }
    }

    private void lockExistingClaim(Long roomId) {
        transactionTemplate.executeWithoutResult(status -> gameFinishClaimRepository.findByRoomIdForUpdate(roomId));
    }

    public void markCompleted(Long roomId, String claimToken) {
        if (claimToken == null || claimToken.isBlank()) {
            return;
        }

        transactionTemplate.executeWithoutResult(status -> gameFinishClaimRepository.findByRoomIdForUpdate(roomId)
                .filter(claim -> claim.isOwnedBy(claimToken))
                .ifPresent(GameFinishClaim::markCompleted));
    }

    public boolean rollback(Long roomId, String claimToken) {
        if (claimToken == null || claimToken.isBlank()) {
            return false;
        }

        Boolean rolledBack = transactionTemplate.execute(status -> gameFinishClaimRepository.findByRoomIdForUpdate(roomId)
                .filter(claim -> claim.isOwnedBy(claimToken))
                .filter(GameFinishClaim::isProcessing)
                .map(claim -> {
                    gameFinishClaimRepository.delete(claim);
                    gameFinishClaimRepository.flush();
                    return true;
                })
                .orElse(false));

        return Boolean.TRUE.equals(rolledBack);
    }

    private String normalizeTrigger(String trigger) {
        if (trigger == null || trigger.isBlank()) {
            return "manual";
        }
        return trigger.trim().toLowerCase(Locale.ROOT);
    }

    public record FinishClaim(boolean granted, String claimToken) {
        static FinishClaim granted(String claimToken) {
            return new FinishClaim(true, claimToken);
        }

        static FinishClaim rejected(String claimToken) {
            return new FinishClaim(false, claimToken);
        }
    }
}
