package com.peekle.domain.leetcode.repository;

import com.peekle.domain.leetcode.entity.LeetcodeProblemRating;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface LeetcodeProblemRatingRepository extends JpaRepository<LeetcodeProblemRating, Long> {
    Optional<LeetcodeProblemRating> findByTitleSlug(String titleSlug);
}
