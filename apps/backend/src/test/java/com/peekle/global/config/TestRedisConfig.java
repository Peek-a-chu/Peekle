package com.peekle.global.config;

import org.mockito.Mockito;
import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;
import org.springframework.data.redis.core.HashOperations;
import org.springframework.data.redis.core.ListOperations;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.SetOperations;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.data.redis.core.ZSetOperations;

import java.util.concurrent.TimeUnit;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;

@Configuration
@Profile("test")
public class TestRedisConfig {

    @Bean
    @Primary
    public RedissonClient redissonClient() throws InterruptedException {
        RedissonClient redissonClient = mock(RedissonClient.class);
        RLock lock = mock(RLock.class);

        lenient().when(redissonClient.getLock(anyString())).thenReturn(lock);
        lenient().when(lock.tryLock(anyLong(), anyLong(), any(TimeUnit.class))).thenReturn(true);
        lenient().when(lock.isHeldByCurrentThread()).thenReturn(true);

        return redissonClient;
    }

    @Bean
    @Primary
    public StringRedisTemplate stringRedisTemplate() {
        StringRedisTemplate redisTemplate = mock(StringRedisTemplate.class);
        ValueOperations<String, String> valueOperations = mock(ValueOperations.class);

        lenient().when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        lenient().when(valueOperations.get(anyString())).thenReturn(null);
        lenient().when(redisTemplate.delete(anyString())).thenReturn(true);

        return redisTemplate;
    }

    @Bean
    @Primary
    @SuppressWarnings("unchecked")
    public RedisTemplate<String, Object> redisTemplate() {
        RedisTemplate<String, Object> redisTemplate = mock(RedisTemplate.class, Mockito.RETURNS_DEEP_STUBS);

        lenient().when(redisTemplate.opsForValue()).thenReturn(mock(ValueOperations.class));
        lenient().when(redisTemplate.opsForHash()).thenReturn(mock(HashOperations.class));
        lenient().when(redisTemplate.opsForList()).thenReturn(mock(ListOperations.class));
        lenient().when(redisTemplate.opsForSet()).thenReturn(mock(SetOperations.class));
        lenient().when(redisTemplate.opsForZSet()).thenReturn(mock(ZSetOperations.class));

        return redisTemplate;
    }
}
