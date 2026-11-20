package com.cinemabooking.service;

import com.cinemabooking.repository.ChatEventOutboxRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ChatEventPublisherTest {
    @Mock ObjectMapper objectMapper;
    @Mock ChatEventOutboxRepository outboxRepository;
    @InjectMocks ChatEventPublisher publisher;

    @Test
    void storesSerializedEventInTransactionalOutbox() throws Exception {
        var event = ChatRealtimeTestData.event();
        when(objectMapper.writeValueAsString(event)).thenReturn("{\"eventId\":\"event-1\"}");

        publisher.conversationChanged(null, event);

        verify(outboxRepository).enqueue("event-1", "{\"eventId\":\"event-1\"}");
    }

    @Test
    void rejectsMutationWhenEventCannotBeSerialized() throws Exception {
        var event = ChatRealtimeTestData.event();
        when(objectMapper.writeValueAsString(event)).thenThrow(new JsonProcessingException("invalid") {});

        assertThrows(IllegalStateException.class, () -> publisher.conversationChanged(null, event));
        verifyNoInteractions(outboxRepository);
    }
}
