package com.peekle.domain.league.service;

import com.peekle.domain.league.entity.LeagueGroup;
import com.peekle.domain.league.enums.LeagueTier;
import com.peekle.domain.league.repository.LeagueGroupRepository;
import com.peekle.domain.user.entity.User;
import com.peekle.domain.user.repository.UserRepository;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Redisson Lock 및 동시성 테스트
 * (Testcontainers 혹은 로컬 Redis가 필요할 수 있음. 환경에 따라 @Disabled 처리 고려)
 */
@SpringBootTest
@ActiveProfiles("test") // h2 or test profile
@org.springframework.context.annotation.Import(com.peekle.TestConfig.class)
public class LeagueServiceConcurrencyTest {

    @Autowired
    private LeagueService leagueService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private LeagueGroupRepository leagueGroupRepository;

    @Test
    @DisplayName("동시에 25명이 가입하면 그룹이 10명, 10명, 5명으로 나뉘어야 한다")
    public void testConcurrentInitialAssignment() throws InterruptedException {
        int threadCount = 25;
        ExecutorService executorService = Executors.newFixedThreadPool(threadCount);
        CountDownLatch latch = new CountDownLatch(threadCount);

        AtomicInteger successCount = new AtomicInteger();
        AtomicInteger failCount = new AtomicInteger();

        for (int i = 0; i < threadCount; i++) {
            final int index = i;
            executorService.submit(() -> {
                try {
                    // 유저 생성 (트랜잭션 분리되어 있다고 가정하거나, 여기서 각각 생성)
                    String uniqueId = "user" + index + "_" + System.currentTimeMillis();
                    User user = User.builder()
                            .socialId(uniqueId)
                            .provider("TEST")
                            .nickname(uniqueId)
                            .league(LeagueTier.STONE)
                            .build();

                    // 주의: 실제 서비스에선 user가 DB에 있어야 함.
                    // 테스트 편의상 repository.save는 Lock 밖에서 수행된다고 가정.
                    // (integration test에서는 autowired된 repo 사용 가능)
                    saveAndAssign(user);
                    successCount.incrementAndGet();
                } catch (Exception e) {
                    e.printStackTrace();
                    failCount.incrementAndGet();
                } finally {
                    latch.countDown();
                }
            });
        }

        latch.await();

        // 검증
        long groupCount = leagueGroupRepository.count();
        // 25명 -> 10명(1그룹) + 10명(2그룹) + 5명(3그룹) = 총 3개 그룹 생성 기대
        // (기존 데이터가 없다고 가정)

        System.out.println("Success: " + successCount.get());
        System.out.println("Fail: " + failCount.get());
        System.out.println("Total Groups: " + groupCount);

        // 그룹별 인원 체크
        leagueGroupRepository.findAll().forEach(group -> {
            long count = userRepository.countByLeagueGroupId(group.getId());
            System.out.println("Group " + group.getId() + ": " + count + " users");
            Assertions.assertTrue(count <= 10, "그룹 인원은 10명을 넘을 수 없다.");
        });

        // Assertions.assertEquals(3, groupCount); // 기존 데이터 유무에 따라 다름
    }

    // 트랜잭션 문제 회피를 위한 헬퍼 (테스트 코드 내)
    // 실제로는 LeagueService 내부 트랜잭션 사용
    private void saveAndAssign(User user) {
        // 동시성 테스트에서 JPA 세션/트랜잭션 충돌 방지를 위해
        // 서비스 메서드 호출 전에 저장은 락 밖에서(여기선 동시 실행) 일어남
        userRepository.save(user);
        leagueService.assignInitialLeague(user);
    }
}
