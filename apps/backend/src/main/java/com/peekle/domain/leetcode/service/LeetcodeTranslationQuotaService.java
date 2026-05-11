package com.peekle.domain.leetcode.service;

import com.peekle.global.exception.BusinessException;
import com.peekle.global.exception.ErrorCode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDate;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;

@Service
@Slf4j
public class LeetcodeTranslationQuotaService {

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.BASIC_ISO_DATE;
    private static final java.time.ZoneId SEOUL_ZONE = java.time.ZoneId.of("Asia/Seoul");

    private final StringRedisTemplate redisTemplate;
    private final int dailyLimit;
    private final int hourlyLimit;

    public LeetcodeTranslationQuotaService(
            StringRedisTemplate redisTemplate,
            @Value("${leetcode.translation.daily-limit:10}") int dailyLimit,
            @Value("${leetcode.translation.hourly-limit:50}") int hourlyLimit
    ) {
        this.redisTemplate = redisTemplate;
        this.dailyLimit = dailyLimit;
        this.hourlyLimit = hourlyLimit;
    }

    public void consume(Long userId) {
        consumeGlobalHourly(userId);
        consumeDaily(userId);
    }

    private void consumeGlobalHourly(Long userId) {
        String key = createGlobalHourlyKey();
        Long usedCount = redisTemplate.opsForValue().increment(key);

        if (usedCount != null && usedCount == 1L) {
            redisTemplate.expire(key, secondsUntilNextHour());
        }

        if (usedCount != null && usedCount > hourlyLimit) {
            log.info("LeetCode 번역 전체 시간당 제한 초과 - userId: {}, usedCount: {}, limit: {}",
                    userId, usedCount, hourlyLimit);
            throw new BusinessException(
                    ErrorCode.TRANSLATION_HOURLY_LIMIT_EXCEEDED,
                    "전체 사용자 기준 최근 1시간 번역 요청이 %d회를 넘었어요. 제작자의 Gemini 토큰 비용과 서버를 보호하기 위해 잠시 제한 중입니다. 잠시 후 다시 시도해 주세요. 양해 부탁드립니다."
                            .formatted(hourlyLimit)
            );
        }
    }

    private void consumeDaily(Long userId) {
        String key = createDailyKey(userId);
        Long usedCount = redisTemplate.opsForValue().increment(key);

        if (usedCount != null && usedCount == 1L) {
            redisTemplate.expire(key, secondsUntilTomorrow());
        }

        if (usedCount != null && usedCount > dailyLimit) {
            log.info("LeetCode 번역 일일 제한 초과 - userId: {}, usedCount: {}, limit: {}",
                    userId, usedCount, dailyLimit);
            throw new BusinessException(
                    ErrorCode.TRANSLATION_DAILY_LIMIT_EXCEEDED,
                    "오늘 번역 가능 횟수 %d회를 모두 사용했어요. 제작자의 Gemini 토큰 비용 보호를 위해 제한 중입니다. 내일 다시 이용해 주세요. 양해 부탁드립니다."
                            .formatted(dailyLimit)
            );
        }
    }

    private String createDailyKey(Long userId) {
        String date = LocalDate.now(SEOUL_ZONE).format(DATE_FORMATTER);
        return "leetcode:translation:quota:%s:%d".formatted(date, userId);
    }

    private String createGlobalHourlyKey() {
        String dateHour = ZonedDateTime.now(SEOUL_ZONE).format(DateTimeFormatter.ofPattern("yyyyMMddHH"));
        return "leetcode:translation:quota:hour:%s:global".formatted(dateHour);
    }

    private Duration secondsUntilTomorrow() {
        ZonedDateTime now = ZonedDateTime.now(SEOUL_ZONE);
        ZonedDateTime tomorrow = now.toLocalDate().plusDays(1).atStartOfDay(SEOUL_ZONE);
        return Duration.between(now, tomorrow).plusMinutes(5);
    }

    private Duration secondsUntilNextHour() {
        ZonedDateTime now = ZonedDateTime.now(SEOUL_ZONE);
        ZonedDateTime nextHour = now.truncatedTo(ChronoUnit.HOURS).plusHours(1);
        return Duration.between(now, nextHour).plusMinutes(5);
    }
}
