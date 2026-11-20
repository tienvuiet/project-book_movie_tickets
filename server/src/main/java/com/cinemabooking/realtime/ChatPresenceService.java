package com.cinemabooking.realtime;

import com.cinemabooking.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.event.EventListener;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.messaging.simp.user.SimpUser;
import org.springframework.messaging.simp.user.SimpUserRegistry;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;

import java.time.Duration;
import java.util.List;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
@Slf4j
public class ChatPresenceService {
    private static final String KEY_PREFIX = "cinemabooking:chat-presence:staff:";

    private final StringRedisTemplate redisTemplate;
    private final SimpUserRegistry simpUserRegistry;

    @Value("${app.chat.presence-ttl-seconds:30}")
    private long presenceTtlSeconds;

    @EventListener
    public void connected(SessionConnectedEvent event) {
        if (isStaff(event.getUser())) refresh(event.getUser().getName());
    }

    @Scheduled(fixedDelayString = "${app.chat.presence-refresh-ms:10000}",
            initialDelayString = "${app.chat.presence-refresh-ms:10000}")
    public void refreshLocalPresence() {
        simpUserRegistry.getUsers().stream()
                .map(SimpUser::getPrincipal)
                .filter(this::isStaff)
                .map(java.security.Principal::getName)
                .forEach(this::refresh);
    }

    public boolean isAnyStaffOnline(List<User> activeStaff) {
        if (activeStaff.isEmpty()) return false;
        try {
            var values = redisTemplate.opsForValue().multiGet(
                    activeStaff.stream().map(User::getEmail).map(this::key).toList());
            return values != null && values.stream().anyMatch(java.util.Objects::nonNull);
        } catch (RuntimeException exception) {
            log.warn("Redis staff presence lookup failed reason={}; using local registry",
                    exception.getClass().getSimpleName());
            var local = simpUserRegistry.getUsers().stream().map(SimpUser::getName).collect(Collectors.toSet());
            return activeStaff.stream().map(User::getEmail).anyMatch(local::contains);
        }
    }

    private void refresh(String email) {
        try {
            redisTemplate.opsForValue().set(key(email), "1", Duration.ofSeconds(presenceTtlSeconds));
        } catch (RuntimeException exception) {
            log.warn("Redis staff presence refresh failed reason={}", exception.getClass().getSimpleName());
        }
    }

    private boolean isStaff(java.security.Principal principal) {
        if (!(principal instanceof Authentication authentication) || !authentication.isAuthenticated()) return false;
        return authentication.getAuthorities().stream()
                .anyMatch(authority -> "ROLE_STAFF".equalsIgnoreCase(authority.getAuthority()));
    }

    private String key(String email) {
        return KEY_PREFIX + email.toLowerCase(java.util.Locale.ROOT);
    }
}
