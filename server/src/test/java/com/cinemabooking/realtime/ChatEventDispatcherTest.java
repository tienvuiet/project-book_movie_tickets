package com.cinemabooking.realtime;

import com.cinemabooking.dto.response.ChatConversationSummaryResponse;
import com.cinemabooking.dto.response.ChatEventResponse;
import com.cinemabooking.entity.Cinema;
import com.cinemabooking.entity.Role;
import com.cinemabooking.entity.User;
import com.cinemabooking.entity.UserRole;
import com.cinemabooking.enums.ChatConversationStatus;
import com.cinemabooking.enums.ChatSourcePage;
import com.cinemabooking.enums.ChatSubject;
import com.cinemabooking.repository.ChatReadReceiptRepository;
import com.cinemabooking.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.user.SimpUser;
import org.springframework.messaging.simp.user.SimpUserRegistry;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ChatEventDispatcherTest {
    @Mock SimpMessagingTemplate messagingTemplate;
    @Mock UserRepository userRepository;
    @Mock ChatReadReceiptRepository readReceiptRepository;
    @Mock SimpUserRegistry simpUserRegistry;
    @InjectMocks ChatEventDispatcher dispatcher;

    @Test
    void deliversOnlyToSessionsConnectedToThisInstance() {
        var cinema = Cinema.builder().id(5L).build();
        var staff = user(20L, "staff@example.com", "STAFF", cinema);
        var admin = user(30L, "admin@example.com", "ADMIN", null);
        var event = event();
        var connectedCustomer = connected("customer@example.com");
        var connectedStaff = connected("staff@example.com");
        var connectedAdmin = connected("admin@example.com");

        when(simpUserRegistry.getUsers()).thenReturn(Set.of(
                connectedCustomer, connectedStaff, connectedAdmin));
        when(userRepository.findActiveChatRecipientsByEmailIn(Set.of("staff@example.com", "admin@example.com")))
                .thenReturn(java.util.List.of(staff, admin));
        when(readReceiptRepository.totalUnreadByStaff(Set.of(20L), 5L)).thenReturn(Map.of(20L, 7L));

        dispatcher.dispatch(event);

        verify(messagingTemplate).convertAndSendToUser("customer@example.com", "/queue/chat", event);
        verify(messagingTemplate).convertAndSendToUser("staff@example.com", "/queue/chat", event.withStaffTotalUnread(7L));
        verify(messagingTemplate).convertAndSendToUser("admin@example.com", "/queue/chat", event);
        verifyNoMoreInteractions(messagingTemplate);
    }

    @Test
    void skipsDatabaseRecipientQueriesWhenOnlyTheCustomerIsConnected() {
        var event = event();
        var connectedCustomer = connected("customer@example.com");
        when(simpUserRegistry.getUsers()).thenReturn(Set.of(connectedCustomer));

        dispatcher.dispatch(event);

        verify(messagingTemplate).convertAndSendToUser("customer@example.com", "/queue/chat", event);
        verifyNoInteractions(userRepository, readReceiptRepository);
    }

    private SimpUser connected(String name) {
        var user = mock(SimpUser.class);
        when(user.getName()).thenReturn(name);
        return user;
    }

    private User user(Long id, String email, String roleName, Cinema cinema) {
        var user = User.builder().id(id).email(email).cinema(cinema).userRoles(new HashSet<>()).build();
        user.getUserRoles().add(UserRole.builder().user(user).role(Role.builder().name(roleName).build()).build());
        return user;
    }

    private ChatEventResponse event() {
        var now = LocalDateTime.now();
        var summary = new ChatConversationSummaryResponse(
                100L, 3L, 10L, "Khách hàng", "customer@example.com", null,
                5L, "Rạp 1", null, null,
                20L, "Nhân viên", ChatSubject.BOOKING, ChatSourcePage.HOME,
                ChatConversationStatus.IN_PROGRESS, now, now, null, null,
                null, null, "Tin nhắn mới", "CUSTOMER", 1,
                null, null, null, null);
        return new ChatEventResponse("event-1", "MESSAGE_CREATED", 100L, 3L, summary, null,
                0, 1, 0, 0, 0, null, null, null, null, Instant.now());
    }
}
