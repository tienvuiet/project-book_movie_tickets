package com.cinemabooking.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class SeatLockService {
    private static final String KEY_PREFIX = "seat-lock:";
    private static final DefaultRedisScript<Long> ACQUIRE_SCRIPT = new DefaultRedisScript<>("""
            for i, key in ipairs(KEYS) do
                if redis.call('EXISTS', key) == 1 then return 0 end
            end
            for i, key in ipairs(KEYS) do
                redis.call('PSETEX', key, ARGV[2], ARGV[1])
            end
            return 1
            """, Long.class);
    private static final DefaultRedisScript<Long> RELEASE_SCRIPT = new DefaultRedisScript<>("""
            local released = 0
            for i, key in ipairs(KEYS) do
                if redis.call('GET', key) == ARGV[1] then
                    redis.call('DEL', key)
                    released = released + 1
                end
            end
            return released
            """, Long.class);

    private final StringRedisTemplate redisTemplate;

    @Value("${app.booking.seat-lock-ttl-minutes:1}")
    private long lockTtlMinutes;

    public boolean acquire(Long showtimeId, Collection<Long> seatIds, Long userId) {
        if (seatIds.isEmpty()) return true;
        var result = redisTemplate.execute(ACQUIRE_SCRIPT, keys(showtimeId, seatIds),
                owner(userId), Long.toString(lockDuration().toMillis()));
        return Long.valueOf(1L).equals(result);
    }

    public void release(Long showtimeId, Collection<Long> seatIds, Long userId) {
        if (!seatIds.isEmpty()) redisTemplate.execute(RELEASE_SCRIPT, keys(showtimeId, seatIds), owner(userId));
    }

    public Set<Long> findLockedSeatIds(Long showtimeId, Collection<Long> seatIds) {
        var orderedSeatIds = new ArrayList<>(seatIds);
        orderedSeatIds.sort(Long::compareTo);
        if (orderedSeatIds.isEmpty()) return Set.of();
        List<String> values = redisTemplate.opsForValue().multiGet(keys(showtimeId, orderedSeatIds));
        var locked = new HashSet<Long>();
        if (values == null) return locked;
        for (int i = 0; i < values.size(); i++) {
            if (values.get(i) != null) locked.add(orderedSeatIds.get(i));
        }
        return locked;
    }

    public Duration lockDuration() {
        return Duration.ofMinutes(Math.max(1, lockTtlMinutes));
    }

    private List<String> keys(Long showtimeId, Collection<Long> seatIds) {
        return seatIds.stream().sorted().map(seatId -> KEY_PREFIX + showtimeId + ":" + seatId).toList();
    }

    private String owner(Long userId) {
        return "user:" + userId;
    }
}
