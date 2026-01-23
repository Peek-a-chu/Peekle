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

        // 1. 목록 조회
        List<StudyRoom> content = queryFactory
                .selectFrom(studyRoom)
                // .leftJoin(studyRoom.owner, user).fetchJoin() // User 엔티티 제거로 인한 조인 불필요
                .join(studyMember).on(studyMember.study.eq(studyRoom))
                .where(
                        studyMember.userId.eq(userId), // 내가 참여한 스터디만 필터링
                        containsKeyword(keyword))
                .orderBy(studyRoom.createdAt.desc())
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .fetch();

        // 2. 카운트 쿼리 (최적화)
        // PageableExecutionUtils를 사용하여 불필요한 카운트 쿼리 생략
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
