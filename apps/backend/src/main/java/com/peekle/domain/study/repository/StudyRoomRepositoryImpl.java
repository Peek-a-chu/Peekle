package com.peekle.domain.study.repository;

import com.peekle.domain.study.entity.StudyRoom;
import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.support.PageableExecutionUtils;
import org.springframework.util.StringUtils;

import java.util.List;

import static com.peekle.domain.study.entity.QStudyRoom.studyRoom;
import static com.peekle.domain.study.entity.QStudyMember.studyMember;

@RequiredArgsConstructor
public class StudyRoomRepositoryImpl implements StudyRoomRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    @Override
    public Page<StudyRoom> findMyStudyRooms(Long userId, String keyword, Pageable pageable) {

        // 1. Content Query
        List<StudyRoom> content = queryFactory
                .selectFrom(studyRoom)
                // .leftJoin(studyRoom.owner, user).fetchJoin() // User Entity removed, no join
                // needed
                .join(studyMember).on(studyMember.study.eq(studyRoom))
                .where(
                        studyMember.userId.eq(userId), // Filter by my participation (userId)
                        containsKeyword(keyword))
                .orderBy(studyRoom.createdAt.desc())
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .fetch();

        // 2. Count Query (Optimized)
        // Using PageableExecutionUtils to skip count query when not necessary
        com.querydsl.jpa.impl.JPAQuery<Long> countQuery = queryFactory
                .select(studyRoom.count())
                .from(studyRoom)
                .join(studyMember).on(studyMember.study.eq(studyRoom))
                .where(
                        studyMember.userId.eq(userId),
                        containsKeyword(keyword));

        return PageableExecutionUtils.getPage(content, pageable, countQuery::fetchOne);
    }

    private BooleanExpression containsKeyword(String keyword) {
        if (!StringUtils.hasText(keyword)) {
            return null;
        }
        return studyRoom.title.containsIgnoreCase(keyword)
                .or(studyRoom.description.containsIgnoreCase(keyword));
    }
}
