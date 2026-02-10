package com.peekle.domain.study.service;

import com.peekle.global.redis.RedisKeyConst;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class RedisStudyProblemService {

    private final RedisTemplate<String, Object> redisTemplate;

    /**
     * 커스텀 문제 설명 저장
     */
    public void saveDescription(Long studyProblemId, String description) {
        String key = String.format(RedisKeyConst.STUDY_PROBLEM_DESC, studyProblemId);
        redisTemplate.opsForValue().set(key, description);
        // 하루 정도 유지 (스터디 세션 기준)
        redisTemplate.expire(key, 24, TimeUnit.HOURS);
    }

    /**
     * 커스텀 문제 설명 조회
     */
    public String getDescription(Long studyProblemId) {
        String key = String.format(RedisKeyConst.STUDY_PROBLEM_DESC, studyProblemId);
        Object value = redisTemplate.opsForValue().get(key);
        return value != null ? value.toString() : "";
    }
}
