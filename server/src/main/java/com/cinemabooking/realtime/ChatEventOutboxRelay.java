package com.cinemabooking.realtime;

import com.cinemabooking.dto.response.ChatEventResponse;
import com.cinemabooking.repository.ChatEventOutboxRepository;
import com.cinemabooking.service.ChatEventPublisher;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class ChatEventOutboxRelay {
    private final ChatEventOutboxRepository outboxRepository;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;
    private final ChatEventDispatcher localDispatcher;
    private final String workerId = UUID.randomUUID().toString();

    @Scheduled(fixedDelayString = "${app.chat.outbox-relay-delay-ms:200}",
            initialDelayString = "${app.chat.outbox-relay-initial-delay-ms:500}")
    public void relayPending() {
        for (var record : outboxRepository.claimBatch(workerId, 50)) relay(record);
    }

    private void relay(ChatEventOutboxRepository.OutboxRecord record) {
        try {
            var subscribers = redisTemplate.convertAndSend(ChatEventPublisher.CHANNEL, record.payload());
            if (subscribers == null || subscribers == 0) {
                deliverLocally(record);
                outboxRepository.retryLater(record.id(), workerId, record.attempts());
                return;
            }
            outboxRepository.markPublished(record.id(), workerId);
        } catch (RuntimeException exception) {
            deliverLocally(record);
            outboxRepository.retryLater(record.id(), workerId, record.attempts());
            log.warn("Chat outbox delivery deferred eventId={} reason={}",
                    record.eventId(), exception.getClass().getSimpleName());
        }
    }

    private void deliverLocally(ChatEventOutboxRepository.OutboxRecord record) {
        try {
            localDispatcher.dispatch(objectMapper.readValue(record.payload(), ChatEventResponse.class));
        } catch (java.io.IOException | RuntimeException exception) {
            outboxRepository.markDead(record.id(), workerId);
            log.error("Chat outbox event marked dead eventId={} reason={}",
                    record.eventId(), exception.getClass().getSimpleName());
        }
    }
}
