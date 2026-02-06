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

        @Override
        public Page<SubmissionLog> findHistory(com.peekle.domain.submission.dto.SubmissionHistoryFilterDto filter,
                        Pageable pageable) {
                com.querydsl.core.BooleanBuilder builder = new com.querydsl.core.BooleanBuilder();

                // User Filtering
                if (filter.getUserId() != null) {
                        builder.and(submissionLog.user.id.eq(filter.getUserId()));
                } else if (filter.getNickname() != null) {
                        builder.and(submissionLog.user.nickname.eq(filter.getNickname()));
                }

                // Tier
                if (filter.getTier() != null && !filter.getTier().equals("전체") && !filter.getTier().equals("ALL")) {
                        // 'Gold' -> tier like 'Gold%'
                        builder.and(submissionLog.problem.tier.startsWith(filter.getTier()));
                }

                // SourceType
                if (filter.getSourceType() != null) {
                        builder.and(submissionLog.sourceType.eq(filter.getSourceType()));
                }

                // Date
                if (filter.getStartDate() != null) {
                        builder.and(submissionLog.submittedAt.goe(filter.getStartDate()));
                }
                if (filter.getEndDate() != null) {
                        builder.and(submissionLog.submittedAt.loe(filter.getEndDate()));
                }

                // Status (isSuccess)
                if (filter.getIsSuccess() != null) {
                        builder.and(submissionLog.isSuccess.eq(filter.getIsSuccess()));
                }

                List<SubmissionLog> content = queryFactory
                                .selectFrom(submissionLog)
                                .join(submissionLog.user).fetchJoin()
                                .leftJoin(submissionLog.problem).fetchJoin()
                                .where(builder)
                                .orderBy(submissionLog.submittedAt.desc())
                                .offset(pageable.getOffset())
                                .limit(pageable.getPageSize())
                                .fetch();

                Long count = queryFactory
                                .select(submissionLog.count())
                                .from(submissionLog)
                                .where(builder)
                                .fetchOne();

                return new PageImpl<>(content, pageable, count != null ? count : 0);
        }
}
