package com.peekle.domain.submission.repository;

import com.peekle.domain.submission.entity.QSubmissionLog;
import com.peekle.domain.submission.entity.SubmissionLog;
import com.querydsl.jpa.JPAExpressions;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.util.List;

import static com.peekle.domain.submission.entity.QSubmissionLog.submissionLog;

@RequiredArgsConstructor
public class SubmissionLogRepositoryImpl implements SubmissionLogRepositoryCustom {

        private final JPAQueryFactory queryFactory;

        @Override
        public Page<SubmissionLog> findLatestSubmissionsByRoomIdAndProblemId(Long roomId, Long problemId,
                        Pageable pageable) {

                QSubmissionLog subLog = new QSubmissionLog("subLog");

                // 1. Content Query
                List<SubmissionLog> content = queryFactory
                                .selectFrom(submissionLog)
                                .join(submissionLog.user).fetchJoin()
                                .where(
                                                submissionLog.roomId.eq(roomId),
                                                submissionLog.problem.id.eq(problemId),
                                                submissionLog.id.in(
                                                                JPAExpressions
                                                                                .select(subLog.id.max())
                                                                                .from(subLog)
                                                                                .where(
                                                                                                subLog.roomId.eq(
                                                                                                                roomId),
                                                                                                subLog.problem.id.eq(
                                                                                                                problemId))
                                                                                .groupBy(subLog.user.id)))
                                .orderBy(submissionLog.submittedAt.desc())
                                .offset(pageable.getOffset())
                                .limit(pageable.getPageSize())
                                .fetch();

                // 2. Count Query
                Long count = queryFactory
                                .select(subLog.user.id.countDistinct())
                                .from(subLog)
                                .where(
                                                subLog.roomId.eq(roomId),
                                                subLog.problem.id.eq(problemId))
                                .fetchOne();

                return new PageImpl<>(content, pageable, count != null ? count : 0);
        }
}
