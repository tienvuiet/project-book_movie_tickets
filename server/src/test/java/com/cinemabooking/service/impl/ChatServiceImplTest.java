package com.cinemabooking.service.impl;

import com.cinemabooking.dto.request.CreateChatConversationRequest;
import com.cinemabooking.dto.request.ChatMessageRequest;
import com.cinemabooking.dto.request.MarkChatReadRequest;
import com.cinemabooking.entity.*;
import com.cinemabooking.enums.ChatConversationStatus;
import com.cinemabooking.enums.ChatSourcePage;
import com.cinemabooking.enums.ChatSubject;
import com.cinemabooking.exception.BusinessException;
import com.cinemabooking.repository.*;
import com.cinemabooking.realtime.ChatPresenceService;
import com.cinemabooking.service.ChatEventPublisher;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.SliceImpl;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ChatServiceImplTest {
    @Mock ChatConversationRepository conversationRepository;
    @Mock ChatMessageRepository messageRepository;
    @Mock UserRepository userRepository;
    @Mock CinemaRepository cinemaRepository;
    @Mock BookingRepository bookingRepository;
    @Mock ShowtimeRepository showtimeRepository;
    @Mock PaymentRepository paymentRepository;
    @Mock ChatEventPublisher eventPublisher;
    @Mock ChatReadReceiptRepository readReceiptRepository;
    @Mock ChatPresenceService chatPresenceService;
    @InjectMocks ChatServiceImpl service;

    private Cinema cinema;
    private User customer;
    private User staff;

    @BeforeEach
    void setUp() {
        cinema = Cinema.builder().id(5L).name("Cinema Quận 1").address("Quận 1").build();
        customer = user(10L, "customer@example.com", "Khách hàng", "CUSTOMER", null);
        staff = user(20L, "staff@example.com", "Nhân viên A", "STAFF", cinema);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(staff.getEmail(), null));
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void acceptUsesLockedConversationAndAssignsOnlyCurrentStaff() {
        var conversation = waitingConversation();
        when(userRepository.findByEmail(staff.getEmail())).thenReturn(Optional.of(staff));
        when(conversationRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(conversation));
        when(conversationRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(messageRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(messageRepository.findMessagePage(eq(100L), isNull(), any())).thenReturn(new SliceImpl<>(java.util.List.of()));

        var result = service.acceptConversation(100L);

        assertEquals(ChatConversationStatus.IN_PROGRESS, result.status());
        assertEquals(staff.getId(), result.assignedStaffId());
        assertSame(staff, conversation.getAssignedStaff());
        verify(conversationRepository).findByIdForUpdate(100L);
        verify(messageRepository).save(argThat(message -> message.getContent().contains("đã tiếp nhận")));
        verify(eventPublisher).conversationChanged(same(conversation), argThat(event ->
                "CONVERSATION_ACCEPTED".equals(event.type()) && event.summary().id().equals(100L)
                        && event.message().content().contains("đã tiếp nhận")));
    }

    @Test
    void acceptRejectsConversationAlreadyTakenByAnotherStaff() {
        var conversation = waitingConversation();
        conversation.setAssignedStaff(user(21L, "other@example.com", "Nhân viên B", "STAFF", cinema));
        conversation.setStatus(ChatConversationStatus.IN_PROGRESS);
        when(userRepository.findByEmail(staff.getEmail())).thenReturn(Optional.of(staff));
        when(conversationRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(conversation));

        assertThrows(BusinessException.class, () -> service.acceptConversation(100L));
        verify(conversationRepository, never()).save(any());
    }

    @Test
    void customerCannotAttachAnotherCustomersBooking() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(customer.getEmail(), null));
        var other = user(11L, "other-customer@example.com", "Khách khác", "CUSTOMER", null);
        var booking = Booking.builder().id(50L).user(other).build();
        when(userRepository.findByEmail(customer.getEmail())).thenReturn(Optional.of(customer));
        when(bookingRepository.findById(50L)).thenReturn(Optional.of(booking));

        var request = new CreateChatConversationRequest(null, 50L, ChatSubject.PAYMENT,
                ChatSourcePage.PAYMENT, "Tôi cần hỗ trợ thanh toán");

        assertThrows(AccessDeniedException.class, () -> service.createConversation(request));
        verify(conversationRepository, never()).save(any());
    }

    @Test
    void staffListReturnsSummariesWithoutLoadingMessageHistory() {
        var conversation = waitingConversation();
        conversation.setLastMessageContent("Tôi cần hỗ trợ");
        conversation.setLastMessageSenderRole("CUSTOMER");
        conversation.setQueueUnreadCount(1);
        when(userRepository.findByEmail(staff.getEmail())).thenReturn(Optional.of(staff));
        when(conversationRepository.findStaffPage(eq(cinema.getId()), eq(staff.getId()), isNull(),
                eq(false), isNull(), isNull(), isNull(), isNull(), any()))
                .thenReturn(new SliceImpl<>(java.util.List.of(conversation)));

        var result = service.getStaffConversations(null, false, null, null, null, 20);

        assertEquals(1, result.items().size());
        assertEquals("Tôi cần hỗ trợ", result.items().get(0).lastMessageContent());
        assertEquals(1, result.items().get(0).unreadCount());
        verify(messageRepository, never()).findMessagePage(anyLong(), any(), any());
    }

    @Test
    void sendMessageReturnsOnlyCreatedMessageWithoutLoadingConversationDetail() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(customer.getEmail(), null));
        var conversation = waitingConversation();
        conversation.setVersion(7L);
        when(userRepository.findByEmail(customer.getEmail())).thenReturn(Optional.of(customer));
        when(conversationRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(conversation));
        when(messageRepository.save(any())).thenAnswer(invocation -> {
            ChatMessage message = invocation.getArgument(0);
            message.setId(501L);
            return message;
        });

        var result = service.sendMessage(100L, new ChatMessageRequest(
                "Tôi cần hỗ trợ", "123e4567-e89b-42d3-a456-426614174000"));

        assertEquals(100L, result.conversationId());
        assertEquals(7L, result.conversationVersion());
        assertEquals(501L, result.message().id());
        assertEquals("Tôi cần hỗ trợ", result.message().content());
        verify(messageRepository, never()).findMessagePage(anyLong(), any(), any());
        verify(conversationRepository, never()).countByCustomerIdAndCinemaId(anyLong(), anyLong());
        verify(paymentRepository, never()).findByBookingId(anyLong());
    }

    @Test
    void sendMessageReturnsExistingMessageForTheSameClientMessageId() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(customer.getEmail(), null));
        var conversation = waitingConversation();
        conversation.setVersion(8L);
        conversation.setLastMessageId(501L);
        conversation.setLastMessageContent("Tôi cần hỗ trợ");
        var existing = ChatMessage.builder().id(501L).conversation(conversation).sender(customer)
                .clientMessageId("123e4567-e89b-42d3-a456-426614174000")
                .content("Tôi cần hỗ trợ").messageType(com.cinemabooking.enums.ChatMessageType.TEXT)
                .createdAt(LocalDateTime.now()).build();
        when(userRepository.findByEmail(customer.getEmail())).thenReturn(Optional.of(customer));
        when(conversationRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(conversation));
        when(messageRepository.findByConversationIdAndClientMessageId(
                100L, "123e4567-e89b-42d3-a456-426614174000")).thenReturn(Optional.of(existing));

        var result = service.sendMessage(100L, new ChatMessageRequest(
                "Tôi cần hỗ trợ", "123e4567-e89b-42d3-a456-426614174000"));

        assertEquals(501L, result.message().id());
        verify(messageRepository, never()).save(any());
        verifyNoInteractions(eventPublisher);
    }

    @Test
    void customerReadReceiptStoresLastVisibleMessageAndPublishesDelta() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(customer.getEmail(), null));
        var conversation = waitingConversation();
        conversation.setAssignedStaff(staff);
        conversation.setStatus(ChatConversationStatus.IN_PROGRESS);
        conversation.setCustomerUnreadCount(1);
        var message = ChatMessage.builder().id(200L).conversation(conversation).sender(staff)
                .content("Nhân viên phản hồi").createdAt(LocalDateTime.now()).build();
        when(userRepository.findByEmail(customer.getEmail())).thenReturn(Optional.of(customer));
        when(conversationRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(conversation));
        when(messageRepository.findById(200L)).thenReturn(Optional.of(message));
        when(messageRepository.countCustomerUnreadAfter(100L, customer.getId(), 200L)).thenReturn(0L);

        service.markRead(100L, new MarkChatReadRequest(200L));

        assertEquals(200L, conversation.getCustomerLastReadMessageId());
        assertEquals(0, conversation.getCustomerUnreadCount());
        verify(readReceiptRepository).save(eq(100L), eq(customer.getId()), eq(200L), eq(0), any());
        verify(eventPublisher).conversationChanged(same(conversation), argThat(event ->
                "READ_RECEIPT_UPDATED".equals(event.type()) && event.lastReadMessageId().equals(200L)
                        && "CUSTOMER".equals(event.readerRole())));
    }

    @Test
    void assigningNewStaffRestoresThatUsersOwnReadState() {
        var admin = user(1L, "admin@example.com", "Quản trị", "ADMIN", null);
        var newStaff = user(22L, "new-staff@example.com", "Nhân viên mới", "STAFF", cinema);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(admin.getEmail(), null));
        var conversation = waitingConversation();
        conversation.setAssignedStaff(staff);
        conversation.setStatus(ChatConversationStatus.IN_PROGRESS);
        conversation.setQueueUnreadCount(5);
        var previousState = new ChatReadReceiptRepository.ReadState(100L, newStaff.getId(), 150L, 0,
                LocalDateTime.now().minusHours(1));
        when(userRepository.findByEmail(admin.getEmail())).thenReturn(Optional.of(admin));
        when(userRepository.findById(newStaff.getId())).thenReturn(Optional.of(newStaff));
        when(conversationRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(conversation));
        when(readReceiptRepository.find(100L, newStaff.getId())).thenReturn(Optional.of(previousState));
        when(messageRepository.countStaffUnreadAfter(100L, customer.getId(), 150L)).thenReturn(4L);
        when(messageRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(messageRepository.findMessagePage(eq(100L), isNull(), any())).thenReturn(new SliceImpl<>(java.util.List.of()));

        service.assignConversation(100L, new com.cinemabooking.dto.request.AssignChatConversationRequest(newStaff.getId()));

        assertSame(newStaff, conversation.getAssignedStaff());
        assertEquals(0, conversation.getQueueUnreadCount());
        verify(readReceiptRepository, atLeastOnce()).save(100L, newStaff.getId(), 150L, 4, previousState.readAt());
    }

    private ChatConversation waitingConversation() {
        var now = LocalDateTime.now();
        return ChatConversation.builder().id(100L).customer(customer).cinema(cinema)
                .subject(ChatSubject.CINEMA_SERVICE).sourcePage(ChatSourcePage.HOME)
                .status(ChatConversationStatus.WAITING).createdAt(now).lastMessageAt(now).build();
    }

    private User user(Long id, String email, String name, String roleName, Cinema assignedCinema) {
        var user = User.builder().id(id).email(email).fullName(name).cinema(assignedCinema)
                .userRoles(new HashSet<>()).build();
        var role = Role.builder().name(roleName).build();
        user.getUserRoles().add(UserRole.builder().user(user).role(role).build());
        return user;
    }
}
