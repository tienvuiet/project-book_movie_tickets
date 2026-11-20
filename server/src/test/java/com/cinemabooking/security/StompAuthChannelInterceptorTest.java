package com.cinemabooking.security;

import com.cinemabooking.service.TokenBlacklistService;
import com.cinemabooking.util.JwtUtil;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

@ExtendWith(MockitoExtension.class)
class StompAuthChannelInterceptorTest {
    @Mock JwtUtil jwtUtil;
    @Mock UserDetailsServiceImpl userDetailsService;
    @Mock TokenBlacklistService tokenBlacklistService;
    @Mock MessageChannel channel;
    @InjectMocks StompAuthChannelInterceptor interceptor;

    @Test
    void allowsAnonymousSeatTopic() {
        assertDoesNotThrow(() -> interceptor.preSend(
                subscribe("/topic/showtimes/10/seats", false), channel));
    }

    @Test
    void requiresAuthenticationForUserChatQueue() {
        assertThrows(AccessDeniedException.class, () -> interceptor.preSend(
                subscribe("/user/queue/chat", false), channel));
    }

    @Test
    void allowsAuthenticatedUserChatQueue() {
        assertDoesNotThrow(() -> interceptor.preSend(
                subscribe("/user/queue/chat", true), channel));
    }

    @Test
    void blocksDirectBrokerQueueEvenForAuthenticatedUsers() {
        assertThrows(AccessDeniedException.class, () -> interceptor.preSend(
                subscribe("/queue/chat-user-session", true), channel));
    }

    private org.springframework.messaging.Message<byte[]> subscribe(String destination, boolean authenticated) {
        var accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setDestination(destination);
        if (authenticated) accessor.setUser(new UsernamePasswordAuthenticationToken("user@example.com", null));
        return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
    }
}
