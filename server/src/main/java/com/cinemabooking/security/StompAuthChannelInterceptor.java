package com.cinemabooking.security;

import com.cinemabooking.service.TokenBlacklistService;
import com.cinemabooking.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Component;

import java.util.regex.Pattern;

@Component
@RequiredArgsConstructor
public class StompAuthChannelInterceptor implements ChannelInterceptor {
    private static final Pattern PUBLIC_SEAT_TOPIC =
            Pattern.compile("^/topic/showtimes/\\d+/seats$");
    private static final String USER_CHAT_QUEUE = "/user/queue/chat";

    private final JwtUtil jwtUtil;
    private final UserDetailsServiceImpl userDetailsService;
    private final TokenBlacklistService tokenBlacklistService;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        var accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null) return message;

        if (StompCommand.CONNECT.equals(accessor.getCommand())) authenticateConnect(accessor);

        if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
            var destination = accessor.getDestination();
            if (destination != null && PUBLIC_SEAT_TOPIC.matcher(destination).matches()) return message;
            if (USER_CHAT_QUEUE.equals(destination) && accessor.getUser() != null) return message;
            throw new AccessDeniedException("Destination WebSocket không được phép");
        }

        if (StompCommand.SEND.equals(accessor.getCommand())) {
            throw new AccessDeniedException("Ứng dụng không nhận STOMP SEND từ client");
        }
        return message;
    }

    private void authenticateConnect(StompHeaderAccessor accessor) {
        var header = accessor.getFirstNativeHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) return;

        var token = header.substring(7);
        if (!jwtUtil.isValid(token) || !jwtUtil.isTokenType(token, "access") ||
                tokenBlacklistService.isAccessTokenRevoked(jwtUtil.extractJti(token)) ||
                !tokenBlacklistService.isSessionVersionValid(jwtUtil.extractSubject(token),
                        jwtUtil.extractSessionVersion(token))) {
            throw new BadCredentialsException("Token WebSocket không hợp lệ");
        }

        var details = userDetailsService.loadUserByUsername(jwtUtil.extractSubject(token));
        if (!details.isEnabled() || !details.isAccountNonLocked()) {
            throw new BadCredentialsException("Tài khoản WebSocket không hoạt động");
        }
        accessor.setUser(new UsernamePasswordAuthenticationToken(details, null, details.getAuthorities()));
    }
}
