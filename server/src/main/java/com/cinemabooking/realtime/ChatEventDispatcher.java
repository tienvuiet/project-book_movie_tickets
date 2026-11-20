package com.cinemabooking.realtime;

import com.cinemabooking.dto.response.ChatEventResponse;
import com.cinemabooking.entity.User;
import com.cinemabooking.repository.ChatReadReceiptRepository;
import com.cinemabooking.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.user.SimpUser;
import org.springframework.messaging.simp.user.SimpUserRegistry;
import org.springframework.stereotype.Component;

import java.util.LinkedHashSet;
import java.util.Set;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
@Slf4j
public class ChatEventDispatcher {
    private final SimpMessagingTemplate messagingTemplate;
    private final UserRepository userRepository;
    private final ChatReadReceiptRepository readReceiptRepository;
    private final SimpUserRegistry simpUserRegistry;

    public void dispatch(ChatEventResponse event) {
        if (event == null || event.summary() == null) {
            log.warn("Ignored chat event without routing summary");
            return;
        }

        var connectedEmails = connectedPrincipals();
        var customerEmail = event.summary().customerEmail();
        if (customerEmail != null && connectedEmails.remove(customerEmail)) {
            send(customerEmail, event.summary().customerId(), "CUSTOMER", event);
        }
        if (connectedEmails.isEmpty()) return;

        var cinemaId = event.summary().cinemaId();
        var recipients = userRepository.findActiveChatRecipientsByEmailIn(connectedEmails);
        var staff = recipients.stream()
                .filter(user -> hasRole(user, "STAFF"))
                .filter(user -> user.getCinema() != null && cinemaId.equals(user.getCinema().getId()))
                .toList();
        var staffIds = staff.stream().map(User::getId).collect(Collectors.toSet());
        var unreadByStaff = staffIds.isEmpty()
                ? java.util.Map.<Long, Long>of()
                : readReceiptRepository.totalUnreadByStaff(staffIds, cinemaId);

        var sent = new LinkedHashSet<String>();
        staff.forEach(user -> {
            if (sent.add(user.getEmail())) {
                send(user.getEmail(), user.getId(), "STAFF",
                        event.withStaffTotalUnread(unreadByStaff.getOrDefault(user.getId(), 0L)));
            }
        });
        recipients.stream().filter(user -> hasRole(user, "ADMIN")).forEach(user -> {
            if (sent.add(user.getEmail())) send(user.getEmail(), user.getId(), "ADMIN", event);
        });
    }

    private Set<String> connectedPrincipals() {
        return simpUserRegistry.getUsers().stream()
                .map(SimpUser::getName)
                .filter(name -> name != null && !name.isBlank())
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private boolean hasRole(User user, String role) {
        return user.getUserRoles().stream()
                .anyMatch(userRole -> userRole.getRole() != null
                        && role.equalsIgnoreCase(userRole.getRole().getName()));
    }

    private void send(String principal, Long recipientId, String recipientRole, ChatEventResponse event) {
        try {
            messagingTemplate.convertAndSendToUser(principal, "/queue/chat", event);
        } catch (RuntimeException exception) {
            log.warn("Could not deliver chat event eventId={} to {} id={}",
                    event.eventId(), recipientRole, recipientId, exception);
        }
    }
}
