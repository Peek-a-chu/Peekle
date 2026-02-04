package com.peekle.domain.study.repository;

import com.peekle.domain.study.entity.StudyRoom;
import com.querydsl.core.BooleanBuilder;
import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.jpa.impl.JPAQuery;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.support.PageableExecutionUtils;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import static com.peekle.domain.study.entity.QStudyMember.studyMember;
import static com.peekle.domain.study.entity.QStudyRoom.studyRoom;
import static com.peekle.domain.user.entity.QUser.user;

@RequiredArgsConstructor
public class StudyRoomRepositoryImpl implements StudyRoomRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    @Override
    public Page<StudyRoom> findMyStudyRooms(Long userId, String keyword, Pageable pageable) {

        // 1. 목록 조회
        List<StudyRoom> content = queryFactory
                .selectFrom(studyRoom)
                .distinct() // 중복 제거
                .leftJoin(studyRoom.owner, user).fetchJoin() // Owner 정보를 가져오기 위해 fetchJoin 추가
                .join(studyMember).on(studyMember.study.eq(studyRoom))
                .where(
                        studyMember.user.id.eq(userId), // 내가 참여한 스터디만 필터링
                        studyRoom.isActive.isTrue(), // 활성화된 스터디만
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
                        studyMember.user.id.eq(userId),
                        studyRoom.isActive.isTrue(), // 활성화된 스터디만
                        containsKeyword(keyword));

        return PageableExecutionUtils.getPage(content, pageable, countQuery::fetchOne);
    }

    // 스터디 랭킹 조회
    @Override
    public Page<StudyRoom> findRankings(Long userId, String keyword, String scope, Pageable pageable) {

        // 동적 조건
        BooleanBuilder builder = new BooleanBuilder();

        // 활성화 된 스터디 룸만 조회
        builder.and(studyRoom.isActive.isTrue());

        // 검색 키워드가 있다면...
        if(StringUtils.hasText(keyword)) {
            builder.and(studyRoom.title.containsIgnoreCase(keyword));
        }

        JPAQuery<Long> query = queryFactory
                .select(studyRoom.id)
                .from(studyRoom);

        // 내 스터디만 필터링 하면!
        if("MINE".equalsIgnoreCase(scope)) {
            query.join(studyMember).on(studyMember.study.eq(studyRoom))
                    .where(studyMember.user.id.eq(userId));
        }
        
        // 조건이 적용된 페이징 처리
        List<Long> ids = query
                .where(builder)
                .orderBy(studyRoom.rankingPoint.desc(), studyRoom.id.asc()) // 랭킹 포인트 내림차순, 동점 시 ID 오름차순
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .fetch();

        if (ids.isEmpty()) {
            return Page.empty(pageable);
        }

        // 조건페이징된 ids로 in 절 조회 (owner 정보도 함께 가져오기)
        List<StudyRoom> content = queryFactory
                .selectFrom(studyRoom)
                .leftJoin(studyRoom.owner, user).fetchJoin() // Owner 정보를 가져오기 위해 fetchJoin 추가
                .where(studyRoom.id.in(ids))
                .fetch();

        // DB에서 가져온 리스트(순서 보장 안됨)를 Map으로 변환
        // Key: ID, Value: StudyRoom 객체
        // 이렇게 하면 ID로 스터디를 바로 찾을 수 있습니다. (Search 속도: O(1))
        Map<Long, StudyRoom> studyMap = content.stream()
                .collect(Collectors.toMap(StudyRoom::getId, Function.identity()));

        // 이미 정렬된 ids 리스트를 순회하면서 Map에서 하나씩 꺼냄
        List<StudyRoom> sortedContent = ids.stream()
                .map(studyMap::get)
                .toList();

        JPAQuery<Long> countQuery = queryFactory
                .select(studyRoom.count())
                .from(studyRoom);

        if ("MINE".equalsIgnoreCase(scope)) {
            countQuery.join(studyMember).on(studyMember.study.eq(studyRoom))
                    .where(studyMember.user.id.eq(userId));
        }

        countQuery.where(builder);

        return PageableExecutionUtils.getPage(sortedContent, pageable, countQuery::fetchOne);
    }

    private BooleanExpression containsKeyword(String keyword) {
        if (!StringUtils.hasText(keyword)) {
            return null;
        }
        return studyRoom.title.containsIgnoreCase(keyword)
                .or(studyRoom.description.containsIgnoreCase(keyword));
    }

    @Override
    public long countHigherRankStudies(int rankingPoint, Long studyId) {
        Long count = queryFactory
                .select(studyRoom.count())
                .from(studyRoom)
                .where(
                        studyRoom.isActive.isTrue()
                                .and(
                                        studyRoom.rankingPoint.gt(rankingPoint)
                                                .or(studyRoom.rankingPoint.eq(rankingPoint).and(studyRoom.id.lt(studyId)))
                                )
                )
                .fetchOne();
        return count != null ? count : 0;
    }
}
