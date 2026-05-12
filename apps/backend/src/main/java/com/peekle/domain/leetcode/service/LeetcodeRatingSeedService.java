package com.peekle.domain.leetcode.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.peekle.domain.leetcode.entity.LeetcodeProblemRating;
import com.peekle.domain.leetcode.repository.LeetcodeProblemRatingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.InputStream;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class LeetcodeRatingSeedService implements ApplicationRunner {

    private static final String RATING_RESOURCE_PATH = "leetcode/zerotrac-leetcode-ratings.json";

    private final LeetcodeProblemRatingRepository leetcodeProblemRatingRepository;
    private final ObjectMapper objectMapper;

    @Override
    @Transactional
    public void run(ApplicationArguments args) throws Exception {
        if (leetcodeProblemRatingRepository.count() > 0) {
            return;
        }

        ClassPathResource resource = new ClassPathResource(RATING_RESOURCE_PATH);
        if (!resource.exists()) {
            log.warn("LeetCode rating seed resource not found: {}", RATING_RESOURCE_PATH);
            return;
        }

        List<ZerotracRatingRow> rows;
        try (InputStream inputStream = resource.getInputStream()) {
            rows = objectMapper.readValue(
                    inputStream,
                    new TypeReference<List<ZerotracRatingRow>>() {
                    });
        }

        List<LeetcodeProblemRating> ratings = rows.stream()
                .filter(row -> row.rating() != null)
                .filter(row -> hasText(row.title()))
                .filter(row -> hasText(row.titleSlug()))
                .map(row -> new LeetcodeProblemRating(
                        row.problemNumber(),
                        row.title().trim(),
                        row.titleSlug().trim(),
                        trimToNull(row.titleZh()),
                        row.rating(),
                        trimToNull(row.contestSlug()),
                        trimToNull(row.problemIndex()),
                        trimToNull(row.contestIdEn()),
                        trimToNull(row.contestIdZh())
                ))
                .toList();

        leetcodeProblemRatingRepository.saveAll(ratings);
        log.info("Seeded {} LeetCode ratings from ZeroTrac.", ratings.size());
    }

    private boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }

    private static String trimToNull(String value) {
        if (value == null || value.trim().isEmpty()) {
            return null;
        }
        return value.trim();
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record ZerotracRatingRow(
            @JsonProperty("Rating") Double rating,
            @JsonProperty("ID") Integer problemNumber,
            @JsonProperty("Title") String title,
            @JsonProperty("TitleZH") String titleZh,
            @JsonProperty("TitleSlug") String titleSlug,
            @JsonProperty("ContestSlug") String contestSlug,
            @JsonProperty("ProblemIndex") String problemIndex,
            @JsonProperty("ContestID_en") String contestIdEn,
            @JsonProperty("ContestID_zh") String contestIdZh
    ) {
    }
}
