package com.cinemabooking.realtime;

import com.cinemabooking.dto.response.ChatEventResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.connection.Message;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class ChatEventSubscriber implements MessageListener {
    private final ObjectMapper objectMapper;
    private final ChatEventDispatcher dispatcher;

    @Override
    public void onMessage(Message message, byte[] pattern) {
        try {
            dispatcher.dispatch(objectMapper.readValue(message.getBody(), ChatEventResponse.class));
        } catch (RuntimeException | java.io.IOException exception) {
            // Do not log the body because it can contain chat and customer data.
            log.warn("Ignored invalid Redis chat event reason={}", exception.getClass().getSimpleName());
        }
    }
}
