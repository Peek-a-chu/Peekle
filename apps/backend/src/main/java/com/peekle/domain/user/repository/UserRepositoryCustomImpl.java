package com.peekle.domain.user.repository;

import com.peekle.domain.user.entity.QUser;
import com.peekle.domain.user.entity.User;
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
public class UserRepositoryCustomImpl implements UserRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    @Override
    public Page<User> searchUsers(String keyword, Pageable pageable) {

        QUser user = QUser.user;

        BooleanBuilder builder = new BooleanBuilder();

        if (StringUtils.hasText(keyword)) {
            builder.and(user.nickname.containsIgnoreCase(keyword));
        }

        // 탈퇴한 회원 제외 등 필터링
        builder.and(user.isDeleted.isFalse());
        List<User> content = queryFactory
                .selectFrom(user)
                .where(builder)
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .fetch();
        long total = queryFactory
                .selectFrom(user)
                .where(builder)
                .fetch().size();

        return new PageImpl<>(content, pageable, total);
    }
}
