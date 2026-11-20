package com.cinemabooking.realtime;

import com.cinemabooking.repository.ChatEventOutboxRepository;
import com.cinemabooking.service.ChatEventPublisher;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;

import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ChatEventOutboxRelayTest {
    @Mock ChatEventOutboxRepository outboxRepository;
    @Mock StringRedisTemplate redisTemplate;
    @Mock ObjectMapper objectMapper;
    @Mock ChatEventDispatcher localDispatcher;
    @InjectMocks ChatEventOutboxRelay relay;

    @Test
    void removesOutboxRecordAfterRedisAcceptsIt() {
        var record = new ChatEventOutboxRepository.OutboxRecord(1L, "event-1", "{}", 0);
        when(outboxRepository.claimBatch(anyString(), eq(50))).thenReturn(List.of(record));
        when(redisTemplate.convertAndSend(ChatEventPublisher.CHANNEL, "{}")).thenReturn(2L);

        relay.relayPending();

        verify(outboxRepository).markPublished(eq(1L), anyString());
        verifyNoInteractions(localDispatcher);
    }

    @Test
    void keepsOutboxRecordForRetryWhenRedisIsUnavailable() throws Exception {
        var event = com.cinemabooking.service.ChatRealtimeTestData.event();
        var record = new ChatEventOutboxRepository.OutboxRecord(1L, "event-1", "{}", 0);
        when(outboxRepository.claimBatch(anyString(), eq(50))).thenReturn(List.of(record));
        when(redisTemplate.convertAndSend(ChatEventPublisher.CHANNEL, "{}"))
                .thenThrow(new IllegalStateException("redis unavailable"));
        when(objectMapper.readValue("{}", com.cinemabooking.dto.response.ChatEventResponse.class)).thenReturn(event);

        relay.relayPending();

        verify(localDispatcher).dispatch(event);
        verify(outboxRepository).retryLater(eq(1L), anyString(), eq(0));
    }
}
