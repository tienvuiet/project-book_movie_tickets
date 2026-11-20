package com.cinemabooking.realtime;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.connection.Message;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class SeatEventSubscriber implements MessageListener {
    private static final String EXPIRED_CHANNEL_SUFFIX = ":expired";
    private static final String SEAT_LOCK_PREFIX = "seat-lock:";

    private final ObjectMapper objectMapper;
    private final SimpMessagingTemplate messagingTemplate;

    @Override
    public void onMessage(Message message, byte[] pattern) {
        var channel = new String(message.getChannel(), StandardCharsets.UTF_8);
        var body = new String(message.getBody(), StandardCharsets.UTF_8);
        try {
            if (channel.endsWith(EXPIRED_CHANNEL_SUFFIX) && body.startsWith(SEAT_LOCK_PREFIX)) {
                forward(expirationEvent(body));
            } else if (SeatEventPublisher.CHANNEL.equals(channel)) {
                forward(objectMapper.readValue(body, SeatEvent.class));
            }
        } catch (RuntimeException | java.io.IOException exception) {
            log.warn("Ignored invalid Redis seat event from channel {}", channel, exception);
        }
    }

    private SeatEvent expirationEvent(String key) {
        var parts = key.split(":");
        if (parts.length != 3) throw new IllegalArgumentException("Invalid seat lock key: " + key);
        return new SeatEvent(SeatEventType.BOOKING_EXPIRED,
                Long.parseLong(parts[1]), List.of(Long.parseLong(parts[2])), null);
    }

    private void forward(SeatEvent event) {
        messagingTemplate.convertAndSend("/topic/showtimes/" + event.showtimeId() + "/seats", event);
    }
}
