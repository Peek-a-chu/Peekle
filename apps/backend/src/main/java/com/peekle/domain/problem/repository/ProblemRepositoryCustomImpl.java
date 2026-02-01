package com.peekle.domain.problem.repository;

import com.peekle.domain.problem.entity.Problem;
import com.peekle.domain.problem.entity.QProblem;
import com.querydsl.core.BooleanBuilder;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;
import org.springframework.util.StringUtils;

import java.util.List;

@Repository
@RequiredArgsConstructor
public class ProblemRepositoryCustomImpl implements ProblemRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    @Override
    public Page<Problem> searchProblems(String keyword, List<String> tiers, List<String> tags, Pageable pageable) {
        QProblem problem = QProblem.problem;

        BooleanBuilder builder = new BooleanBuilder();

        // 키워드 검색 (문제 제목!)
        if (StringUtils.hasText(keyword)) {
            builder.and(problem.title.containsIgnoreCase(keyword));
        }

        // 난이도 검색
        if (tiers != null && !tiers.isEmpty()) {
            BooleanBuilder tierBuilder = new BooleanBuilder();
            for (String tier : tiers) {
                tierBuilder.or(problem.tier.startsWithIgnoreCase(tier)); // Gold면 모든 Gold문제 다 매칭
            }
            builder.and(tierBuilder);
        }

        // 태그 검색
        if (tags != null && !tags.isEmpty()) {
            builder.and(problem.tags.any().name.in(tags));
        }

        List<Problem> content = queryFactory
                .selectFrom(problem)
                .where(builder)
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .fetch();

        // Count Query
        long total = queryFactory
                .selectFrom(problem)
                .where(builder)
                .fetch().size();

        return new PageImpl<>(content, pageable, total);
    }
}
