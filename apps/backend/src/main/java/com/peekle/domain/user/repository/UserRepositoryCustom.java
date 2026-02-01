package com.peekle.domain.user.repository;

import com.peekle.domain.user.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface UserRepositoryCustom {
    Page<User> searchUsers(String keyword, Pageable pageable);
}
