package com.peekle.domain.benchmark.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.data.redis.connection.RedisConnection;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@Profile("benchmark")
@RequiredArgsConstructor
public class BenchmarkEnvironmentInitializer implements ApplicationRunner {

    private final RedisConnectionFactory redisConnectionFactory;
    @Value("${benchmark.redis.flush-on-startup:false}")
    private boolean flushOnStartup;

    @Override
    public void run(ApplicationArguments args) {
        if (!flushOnStartup) {
            log.info("🧪 [Benchmark] Redis FLUSHDB skipped (benchmark.redis.flush-on-startup=false)");
            return;
        }

        try (RedisConnection connection = redisConnectionFactory.getConnection()) {
            connection.serverCommands().flushDb();
            log.info("🧪 [Benchmark] Redis DB flushed for isolated benchmark startup");
        }
    }
}
