package com.peekle.domain.league.service;

import com.peekle.domain.point.entity.PointLog;
import com.peekle.domain.point.repository.PointLogRepository;
import com.peekle.domain.problem.entity.Problem;
import com.peekle.domain.submission.repository.SubmissionLogRepository;
import com.peekle.domain.user.entity.User;
import com.peekle.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class LeagueService {

    private final PointLogRepository pointLogRepository;
    private final SubmissionLogRepository submissionLogRepository;
    private final UserRepository userRepository;

    /**
     * 문제 해결 시 리그 포인트 업데이트
     * - 중복 해결 여부를 체크하고, 최초 해결 시 포인트 지급
     */
    public int updateLeaguePointForSolvedProblem(User user, Problem problem) {
        // 이미 해결한 기록이 1개(방금 저장한 것)뿐인지 확인 = 최초 해결
        long successCount = submissionLogRepository.countByUserIdAndProblemId(
                user.getId(), problem.getId()
        );

        // 로직 개선: successCount가 1일 때만 주는데, 간혹 동시성이 있을 수 있음.
        // 하지만 여기선 간단히 1이면 최초라고 가정. (원래는 exists check를 먼저 하고 save했어야 함)
        
        if (successCount == 1) {
            int pointAmount = calculateProblemPoint(problem.getTier());
            
            user.addLeaguePoint(pointAmount);
            userRepository.save(user);

import com.peekle.domain.point.enums.PointCategory;

//...

            String description = String.format("Solved problem: %s (%s)", problem.getTitle(), problem.getTier());
            PointLog pointLog = new PointLog(user, PointCategory.PROBLEM, pointAmount, description);
            pointLogRepository.save(pointLog);

            System.out.println("🏆 League Point Updated! User: " + user.getNickname() + ", Points: +" + pointAmount);
            return pointAmount;
        } else {
            System.out.println("⚠️ Already solved. No league points awarded.");
            return 0; // 포인트 없음
        }
    }

    public int getUserRank(User user) {
        if (user.getLeagueGroupId() != null) {
            return (int) userRepository.countByLeagueGroupIdAndLeaguePointGreaterThan(
                    user.getLeagueGroupId(), user.getLeaguePoint()
            ) + 1;
        } else {
            return (int) userRepository.countByLeaguePointGreaterThan(user.getLeaguePoint()) + 1;
        }
    }

    private int calculateProblemPoint(String tier) {
        return com.peekle.global.util.SolvedAcLevelUtil.getPointFromTier(tier);
    }
}
