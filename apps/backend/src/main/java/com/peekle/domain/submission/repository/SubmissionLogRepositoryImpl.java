package com.peekle.domain.submission.repository;

import com.peekle.domain.submission.entity.QSubmissionLog;
import com.peekle.domain.submission.entity.SubmissionLog;
import com.querydsl.jpa.JPAExpressions;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;

import java.util.List;

import static com.peekle.domain.submission.entity.QSubmissionLog.submissionLog;

@RequiredArgsConstructor
public class SubmissionLogRepositoryImpl implements SubmissionLogRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    @Override
    public List<SubmissionLog> findLatestLogsPerUser(Long roomId, Long problemId) {
        // SubQuery: 각 유저별로 가장 최근(ID가 가장 큰) 제출의 ID를 조회
        QSubmissionLog subLog = new QSubmissionLog("subLog");

        return queryFactory
                .selectFrom(submissionLog)
                .join(submissionLog.user).fetchJoin() // N+1 방지
                .where(
                        submissionLog.roomId.eq(roomId),
                        submissionLog.problem.id.eq(problemId),
                        submissionLog.id.in(
                                JPAExpressions
                                        .select(subLog.id.max())
                                        .from(subLog)
                                        .where(
                                                subLog.roomId.eq(roomId),
                                                subLog.problem.id.eq(problemId))
                                        .groupBy(subLog.user.id)))
                .orderBy(submissionLog.submittedAt.desc())
                .fetch();
    }
}
