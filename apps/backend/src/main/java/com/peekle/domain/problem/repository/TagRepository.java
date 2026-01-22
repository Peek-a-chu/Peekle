package com.peekle.domain.problem.repository;

import com.peekle.domain.problem.entity.Tag;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface TagRepository extends JpaRepository<Tag, Long> {
    Optional<Tag> findByKey(String key);
}
