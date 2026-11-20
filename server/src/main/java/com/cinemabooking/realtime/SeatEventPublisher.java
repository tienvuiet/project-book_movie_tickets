package com.cinemabooking.realtime;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Component
@RequiredArgsConstructor
@Slf4j
public class SeatEventPublisher {
    public static final String CHANNEL = "cinemabooking:seat-events";

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    public void publishAfterCommit(SeatEvent event) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    publish(event);
                }
            });
        } else {
            publish(event);
        }
    }

    private void publish(SeatEvent event) {
        try {
            redisTemplate.convertAndSend(CHANNEL, objectMapper.writeValueAsString(event));
        } catch (JsonProcessingException | RuntimeException exception) {
            // Booking correctness must not depend on this best-effort notification.
            // Clients perform a full HTTP refresh whenever WebSocket reconnects.
            log.error("Could not publish realtime seat event {}", event, exception);
        }
    }
}
