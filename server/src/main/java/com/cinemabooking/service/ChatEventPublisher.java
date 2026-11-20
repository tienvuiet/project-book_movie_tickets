package com.cinemabooking.service;

import com.cinemabooking.dto.response.ChatEventResponse;
import com.cinemabooking.entity.ChatConversation;
import com.cinemabooking.repository.ChatEventOutboxRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ChatEventPublisher {
    public static final String CHANNEL = "cinemabooking:chat-events";

    private final ObjectMapper objectMapper;
    private final ChatEventOutboxRepository outboxRepository;

    public void conversationChanged(ChatConversation conversation, ChatEventResponse event) {
        try {
            outboxRepository.enqueue(event.eventId(), objectMapper.writeValueAsString(event));
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Could not serialize chat event " + event.eventId(), exception);
        }
    }
}
