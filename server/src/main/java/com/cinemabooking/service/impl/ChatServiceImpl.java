package com.cinemabooking.service.impl;

import com.cinemabooking.dto.request.AssignChatConversationRequest;
import com.cinemabooking.dto.request.ChatMessageRequest;
import com.cinemabooking.dto.request.CreateChatConversationRequest;
import com.cinemabooking.dto.request.MarkChatReadRequest;
import com.cinemabooking.dto.response.*;
import com.cinemabooking.entity.*;
import com.cinemabooking.enums.*;
import com.cinemabooking.exception.BusinessException;
import com.cinemabooking.exception.ErrorCode;
import com.cinemabooking.exception.ResourceNotFoundException;
import com.cinemabooking.repository.*;
import com.cinemabooking.repository.ChatReadReceiptRepository.ReadState;
import com.cinemabooking.realtime.ChatPresenceService;
import com.cinemabooking.security.CurrentUser;
import com.cinemabooking.service.ChatEventPublisher;
import com.cinemabooking.service.ChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ChatServiceImpl implements ChatService {
    private final ChatConversationRepository conversationRepository;
    private final ChatMessageRepository messageRepository;
    private final UserRepository userRepository;
    private final CinemaRepository cinemaRepository;
    private final BookingRepository bookingRepository;
    private final ShowtimeRepository showtimeRepository;
    private final PaymentRepository paymentRepository;
    private final ChatEventPublisher eventPublisher;
    private final ChatReadReceiptRepository readReceiptRepository;
    private final ChatPresenceService chatPresenceService;

    @Override
    @Transactional(readOnly = true)
    public ChatUnreadCountResponse getUnreadCount() {
        var user = currentUser();
        if (hasRole(user, "CUSTOMER")) {
            return new ChatUnreadCountResponse(conversationRepository.sumCustomerUnread(user.getId()));
        }
        if (hasRole(user, "STAFF") && user.getCinema() != null) {
            return new ChatUnreadCountResponse(readReceiptRepository.totalUnread(user.getId(), user.getCinema().getId()));
        }
        return new ChatUnreadCountResponse(0);
    }

    @Override
    @Transactional(readOnly = true)
    public ChatContextResponse resolveContext(Long cinemaId, Long showtimeId, Long bookingId) {
        var current = currentUser();
        Booking booking = null;
        Cinema cinema;

        if (bookingId != null) {
            booking = bookingRepository.findById(bookingId)
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy booking"));
            requireBookingOwner(booking, current);
            cinema = booking.getShowtime().getRoom().getCinema();
            if (cinemaId != null && !cinema.getId().equals(cinemaId)) {
                throw business("Booking không thuộc rạp đã chọn");
            }
        } else if (showtimeId != null) {
            var showtime = showtimeRepository.findById(showtimeId)
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy suất chiếu"));
            cinema = showtime.getRoom().getCinema();
            if (cinemaId != null && !cinema.getId().equals(cinemaId)) {
                throw business("Suất chiếu không thuộc rạp đã chọn");
            }
        } else {
            if (cinemaId == null) throw business("Bạn phải chọn rạp trước khi bắt đầu chat");
            cinema = cinemaRepository.findById(cinemaId)
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy rạp"));
        }

        return contextResponse(cinema, booking);
    }

    @Override
    @Transactional
    public ChatConversationResponse createConversation(CreateChatConversationRequest request) {
        var customer = currentUser();
        if (!hasRole(customer, "CUSTOMER")) throw new AccessDeniedException("Chỉ khách hàng được tạo yêu cầu hỗ trợ");

        Booking booking = null;
        Cinema cinema;
        if (request.bookingId() != null) {
            booking = bookingRepository.findById(request.bookingId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy booking"));
            requireBookingOwner(booking, customer);
            cinema = booking.getShowtime().getRoom().getCinema();
            if (request.cinemaId() != null && !cinema.getId().equals(request.cinemaId())) {
                throw business("Booking không thuộc rạp đã chọn");
            }
        } else {
            if (request.cinemaId() == null) throw business("Bạn phải chọn rạp trước khi gửi tin nhắn");
            cinema = cinemaRepository.findById(request.cinemaId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy rạp"));
        }

        var now = LocalDateTime.now();
        var conversation = conversationRepository.save(ChatConversation.builder()
                .customer(customer)
                .cinema(cinema)
                .booking(booking)
                .subject(request.subject())
                .sourcePage(request.sourcePage())
                .status(ChatConversationStatus.WAITING)
                .createdAt(now)
                .lastMessageAt(now)
                .build());

        addSystemMessage(conversation, "Cuộc trò chuyện đã được gửi đến " + cinema.getName() + ".");
        var message = addTextMessage(conversation, customer, request.content().trim(), null, now);
        conversation.setLastMessageAt(now);
        conversationRepository.save(conversation);
        enqueueEvent(conversation, "CONVERSATION_CREATED", message);
        return response(conversation);
    }

    @Override
    @Transactional(readOnly = true)
    public CursorPageResponse<ChatConversationSummaryResponse> getMyConversations(String cursor, int size) {
        var user = currentUser();
        var position = decodeCursor(cursor);
        var slice = conversationRepository.findCustomerPage(user.getId(), position.time(), position.id(), page(size));
        return summaryPage(slice, user);
    }

    @Override
    @Transactional(readOnly = true)
    public ChatConversationResponse getConversation(Long id) {
        var conversation = conversation(id);
        var user = currentUser();
        requireCanView(conversation, user);
        return response(conversation);
    }

    @Override
    @Transactional(readOnly = true)
    public ChatMessagePageResponse getMessages(Long id, Long beforeId, int size) {
        var conversation = conversation(id);
        requireCanView(conversation, currentUser());
        return messagePage(conversation, beforeId, size);
    }

    @Override
    @Transactional
    public void markRead(Long id, MarkChatReadRequest request) {
        var conversation = lockedConversation(id);
        var user = currentUser();
        requireCanView(conversation, user);
        var message = messageRepository.findById(request.lastReadMessageId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tin nhắn"));
        if (!message.getConversation().getId().equals(conversation.getId())) {
            throw business("Tin nhắn không thuộc cuộc trò chuyện này");
        }

        var now = LocalDateTime.now();
        String readerRole;
        if (hasRole(user, "CUSTOMER")) {
            if (!conversation.getCustomer().getId().equals(user.getId())) {
                throw new AccessDeniedException("Không có quyền đánh dấu đã đọc");
            }
            if (conversation.getCustomerLastReadMessageId() != null &&
                    request.lastReadMessageId() <= conversation.getCustomerLastReadMessageId()) return;
            conversation.setCustomerLastReadMessageId(request.lastReadMessageId());
            conversation.setCustomerReadAt(now);
            conversation.setCustomerUnreadCount((int) messageRepository.countCustomerUnreadAfter(
                    id, conversation.getCustomer().getId(), request.lastReadMessageId()));
            readerRole = "CUSTOMER";
        } else if (hasRole(user, "STAFF")) {
            requireSameCinema(conversation, user);
            if (conversation.getAssignedStaff() == null ||
                    !conversation.getAssignedStaff().getId().equals(user.getId())) {
                throw new AccessDeniedException("Chỉ nhân viên phụ trách mới được đánh dấu đã đọc");
            }
            var state = readReceiptRepository.find(id, user.getId()).orElse(null);
            if (state != null && state.lastReadMessageId() != null &&
                    request.lastReadMessageId() <= state.lastReadMessageId()) return;
            var unread = (int) messageRepository.countStaffUnreadAfter(
                    id, conversation.getCustomer().getId(), request.lastReadMessageId());
            readReceiptRepository.save(id, user.getId(), request.lastReadMessageId(), unread, now);
            conversation.setReadStateUpdatedAt(now);
            readerRole = "STAFF";
        } else {
            throw new AccessDeniedException("Quản trị viên không thay đổi trạng thái đọc của người hỗ trợ");
        }
        if ("CUSTOMER".equals(readerRole)) {
            readReceiptRepository.save(id, user.getId(), request.lastReadMessageId(),
                    conversation.getCustomerUnreadCount(), now);
        }
        conversationRepository.save(conversation);
        enqueueEvent(conversation, "READ_RECEIPT_UPDATED", null,
                user.getId(), readerRole, request.lastReadMessageId(), now);
    }

    @Override
    @Transactional
    public SendChatMessageResponse sendMessage(Long id, ChatMessageRequest request) {
        var conversation = lockedConversation(id);
        var sender = currentUser();
        requireCanSend(conversation, sender);
        var clientMessageId = request.clientMessageId() == null || request.clientMessageId().isBlank()
                ? java.util.UUID.randomUUID().toString() : request.clientMessageId();
        var existing = messageRepository.findByConversationIdAndClientMessageId(id, clientMessageId);
        if (existing.isPresent()) return sentMessageResponse(conversation, existing.get());
        if (conversation.getStatus() == ChatConversationStatus.CLOSED ||
                conversation.getStatus() == ChatConversationStatus.RESOLVED) {
            throw business("Cuộc trò chuyện đã kết thúc, không thể gửi thêm tin nhắn");
        }

        var now = LocalDateTime.now();
        var message = addTextMessage(conversation, sender, request.content().trim(), clientMessageId, now);
        conversation.setLastMessageAt(now);
        conversationRepository.save(conversation);
        enqueueEvent(conversation, "MESSAGE_CREATED", message);
        return sentMessageResponse(conversation, message);
    }

    @Override
    @Transactional
    public ChatConversationResponse closeConversation(Long id) {
        var conversation = lockedConversation(id);
        var customer = currentUser();
        if (!conversation.getCustomer().getId().equals(customer.getId())) throw new AccessDeniedException("Không có quyền đóng cuộc trò chuyện");
        if (conversation.getStatus() != ChatConversationStatus.RESOLVED) {
            throw business("Chỉ có thể đóng yêu cầu đã được nhân viên giải quyết");
        }
        conversation.setStatus(ChatConversationStatus.CLOSED);
        conversation.setClosedAt(LocalDateTime.now());
        var message = addSystemMessage(conversation, "Khách hàng đã xác nhận vấn đề được giải quyết.");
        conversationRepository.save(conversation);
        enqueueEvent(conversation, "CONVERSATION_CLOSED", message);
        return response(conversation);
    }

    @Override
    @Transactional
    public ChatConversationResponse reopenConversation(Long id) {
        var conversation = lockedConversation(id);
        var customer = currentUser();
        if (!conversation.getCustomer().getId().equals(customer.getId())) throw new AccessDeniedException("Không có quyền mở lại cuộc trò chuyện");
        if (conversation.getStatus() != ChatConversationStatus.RESOLVED) {
            throw business("Chỉ có thể yêu cầu hỗ trợ tiếp khi cuộc trò chuyện đang chờ xác nhận");
        }
        conversation.setStatus(conversation.getAssignedStaff() == null
                ? ChatConversationStatus.WAITING : ChatConversationStatus.IN_PROGRESS);
        conversation.setResolvedAt(null);
        var message = addSystemMessage(conversation, "Khách hàng vẫn cần hỗ trợ thêm.");
        conversationRepository.save(conversation);
        enqueueEvent(conversation, "CONVERSATION_REOPENED", message);
        return response(conversation);
    }

    @Override
    @Transactional(readOnly = true)
    public CursorPageResponse<ChatConversationSummaryResponse> getStaffConversations(
            ChatConversationStatus status, Boolean mine, ChatSubject subject, Boolean hasBooking,
            String cursor, int size) {
        var staff = currentUser();
        if (!hasRole(staff, "STAFF")) throw new AccessDeniedException("Chỉ nhân viên rạp được truy cập hàng đợi");
        if (staff.getCinema() == null) throw business("Nhân viên chưa được phân công rạp");

        var position = decodeCursor(cursor);
        var slice = conversationRepository.findStaffPage(staff.getCinema().getId(), staff.getId(), status,
                Boolean.TRUE.equals(mine), subject, hasBooking, position.time(), position.id(), page(size));
        return summaryPage(slice, staff);
    }

    @Override
    @Transactional
    public ChatConversationResponse acceptConversation(Long id) {
        var staff = currentUser();
        if (!hasRole(staff, "STAFF")) throw new AccessDeniedException("Chỉ nhân viên rạp được tiếp nhận chat");
        if (staff.getCinema() == null) throw business("Nhân viên chưa được phân công rạp");

        var conversation = lockedConversation(id);
        requireSameCinema(conversation, staff);
        if (conversation.getStatus() != ChatConversationStatus.WAITING || conversation.getAssignedStaff() != null) {
            throw business("Cuộc trò chuyện đã được nhân viên khác tiếp nhận");
        }

        conversation.setAssignedStaff(staff);
        conversation.setStatus(ChatConversationStatus.IN_PROGRESS);
        prepareStaffAssignment(conversation, staff);
        var message = addSystemMessage(conversation, staff.getFullName() + " đã tiếp nhận cuộc trò chuyện.");
        conversationRepository.save(conversation);
        enqueueEvent(conversation, "CONVERSATION_ACCEPTED", message);
        return response(conversation);
    }

    @Override
    @Transactional
    public ChatConversationResponse resolveConversation(Long id) {
        var actor = currentUser();
        var conversation = lockedConversation(id);
        if (!hasRole(actor, "ADMIN")) {
            requireSameCinema(conversation, actor);
            if (conversation.getAssignedStaff() == null || !conversation.getAssignedStaff().getId().equals(actor.getId())) {
                throw new AccessDeniedException("Chỉ nhân viên đang phụ trách mới được hoàn tất yêu cầu");
            }
        }
        if (conversation.getStatus() != ChatConversationStatus.IN_PROGRESS) {
            throw business("Chỉ có thể hoàn tất cuộc trò chuyện đang được xử lý");
        }
        conversation.setStatus(ChatConversationStatus.RESOLVED);
        conversation.setResolvedAt(LocalDateTime.now());
        var message = addSystemMessage(conversation, actor.getFullName() + " đã đánh dấu vấn đề là đã giải quyết.");
        conversationRepository.save(conversation);
        enqueueEvent(conversation, "CONVERSATION_RESOLVED", message);
        return response(conversation);
    }

    @Override
    @Transactional(readOnly = true)
    public CursorPageResponse<ChatConversationSummaryResponse> getAdminConversations(
            ChatConversationStatus status, Long cinemaId, String cursor, int size) {
        var admin = currentUser();
        if (!hasRole(admin, "ADMIN")) throw new AccessDeniedException("Chỉ quản trị viên được truy cập");
        var position = decodeCursor(cursor);
        var slice = conversationRepository.findAdminPage(status, cinemaId, position.time(), position.id(), page(size));
        return summaryPage(slice, admin);
    }

    @Override
    @Transactional
    public ChatConversationResponse assignConversation(Long id, AssignChatConversationRequest request) {
        var admin = currentUser();
        if (!hasRole(admin, "ADMIN")) throw new AccessDeniedException("Chỉ quản trị viên được chuyển nhân viên xử lý");
        var conversation = lockedConversation(id);
        var staff = userRepository.findById(request.staffId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy nhân viên"));
        if (!hasRole(staff, "STAFF") || staff.getCinema() == null ||
                !staff.getCinema().getId().equals(conversation.getCinema().getId())) {
            throw business("Nhân viên phải thuộc đúng rạp của cuộc trò chuyện");
        }
        if (conversation.getStatus() == ChatConversationStatus.CLOSED || conversation.getStatus() == ChatConversationStatus.RESOLVED) {
            throw business("Không thể phân công cuộc trò chuyện đã kết thúc");
        }
        conversation.setAssignedStaff(staff);
        conversation.setStatus(ChatConversationStatus.IN_PROGRESS);
        prepareStaffAssignment(conversation, staff);
        var message = addSystemMessage(conversation, "Quản trị viên đã chuyển cuộc trò chuyện cho " + staff.getFullName() + ".");
        conversationRepository.save(conversation);
        enqueueEvent(conversation, "CONVERSATION_ASSIGNED", message);
        return response(conversation);
    }

    private ChatContextResponse contextResponse(Cinema cinema, Booking booking) {
        var online = chatPresenceService.isAnyStaffOnline(userRepository.findActiveStaffByCinemaId(cinema.getId()));
        return new ChatContextResponse(cinema.getId(), cinema.getName(), cinema.getAddress(), cinema.getPhone(),
                online, booking == null ? null : booking.getId(), bookingResponse(booking));
    }

    private ChatConversationResponse response(ChatConversation conversation) {
        var customer = conversation.getCustomer();
        var cinema = conversation.getCinema();
        var staff = conversation.getAssignedStaff();
        var staffReadState = staff == null ? null : readReceiptRepository.find(conversation.getId(), staff.getId()).orElse(null);
        var messagePage = messagePage(conversation, null, 30);
        return new ChatConversationResponse(
                conversation.getId(), conversation.getVersion(), customer.getId(), customer.getFullName(), customer.getEmail(), customer.getPhone(),
                cinema.getId(), cinema.getName(), cinema.getAddress(), cinema.getPhone(),
                staff == null ? null : staff.getId(), staff == null ? null : staff.getFullName(),
                conversation.getSubject(), conversation.getSourcePage(), conversation.getStatus(),
                conversation.getLastMessageAt(), conversation.getCreatedAt(), conversation.getResolvedAt(),
                conversation.getClosedAt(), bookingResponse(conversation.getBooking()), messagePage.items(),
                messagePage.nextBeforeId(), messagePage.hasMore(),
                conversationRepository.countByCustomerIdAndCinemaId(customer.getId(), cinema.getId()),
                conversation.getCustomerLastReadMessageId(),
                staffReadState == null ? null : staffReadState.lastReadMessageId(),
                conversation.getCustomerReadAt(), staffReadState == null ? null : staffReadState.readAt());
    }

    private ChatMessagePageResponse messagePage(ChatConversation conversation, Long beforeId, int requestedSize) {
        var slice = messageRepository.findMessagePage(conversation.getId(), beforeId, page(requestedSize));
        var newestFirst = new ArrayList<>(slice.getContent());
        Collections.reverse(newestFirst);
        var items = newestFirst.stream().map(item -> messageResponse(item, conversation)).toList();
        var nextBeforeId = slice.hasNext() && !newestFirst.isEmpty() ? newestFirst.get(0).getId() : null;
        return new ChatMessagePageResponse(items, nextBeforeId, slice.hasNext());
    }

    private CursorPageResponse<ChatConversationSummaryResponse> summaryPage(
            org.springframework.data.domain.Slice<ChatConversation> slice, User viewer) {
        var conversationIds = slice.getContent().stream().map(ChatConversation::getId).toList();
        var assignedStates = readReceiptRepository.findAssignedStates(conversationIds);
        var items = slice.getContent().stream()
                .map(item -> summary(item, viewer, assignedStates.get(item.getId()))).toList();
        String nextCursor = null;
        if (slice.hasNext() && !slice.getContent().isEmpty()) {
            var last = slice.getContent().get(slice.getContent().size() - 1);
            nextCursor = encodeCursor(last.getLastMessageAt(), last.getId());
        }
        long totalUnread = 0;
        if (hasRole(viewer, "CUSTOMER")) {
            totalUnread = conversationRepository.sumCustomerUnread(viewer.getId());
        } else if (hasRole(viewer, "STAFF") && viewer.getCinema() != null) {
            totalUnread = readReceiptRepository.totalUnread(viewer.getId(), viewer.getCinema().getId());
        }
        return new CursorPageResponse<>(items, nextCursor, slice.hasNext(), totalUnread);
    }

    private ChatConversationSummaryResponse summary(ChatConversation conversation, User viewer, ReadState assignedState) {
        var customer = conversation.getCustomer();
        var cinema = conversation.getCinema();
        var staff = conversation.getAssignedStaff();
        var booking = conversation.getBooking();
        int unread;
        if (viewer != null && hasRole(viewer, "CUSTOMER")) {
            unread = conversation.getCustomerUnreadCount();
        } else if (viewer != null && hasRole(viewer, "STAFF")) {
            unread = staff == null ? conversation.getQueueUnreadCount()
                    : staff.getId().equals(viewer.getId()) && assignedState != null ? assignedState.unreadCount() : 0;
        } else {
            unread = assignedState == null ? conversation.getQueueUnreadCount() : assignedState.unreadCount();
        }
        return new ChatConversationSummaryResponse(
                conversation.getId(), conversation.getVersion(), customer.getId(), customer.getFullName(), customer.getEmail(), customer.getPhone(),
                cinema.getId(), cinema.getName(), cinema.getAddress(), cinema.getPhone(),
                staff == null ? null : staff.getId(), staff == null ? null : staff.getFullName(),
                conversation.getSubject(), conversation.getSourcePage(), conversation.getStatus(),
                conversation.getLastMessageAt(), conversation.getCreatedAt(), conversation.getResolvedAt(),
                conversation.getClosedAt(), booking == null ? null : booking.getId(),
                booking == null ? null : booking.getBookingCode(), conversation.getLastMessageContent(),
                conversation.getLastMessageSenderRole(), unread,
                conversation.getCustomerLastReadMessageId(),
                assignedState == null ? null : assignedState.lastReadMessageId(),
                conversation.getCustomerReadAt(), assignedState == null ? null : assignedState.readAt());
    }

    private ChatMessageResponse messageResponse(ChatMessage message, ChatConversation conversation) {
        var sender = message.getSender();
        var role = "SYSTEM";
        if (sender != null) {
            role = sender.getId().equals(conversation.getCustomer().getId())
                    ? "CUSTOMER" : (hasRole(sender, "ADMIN") ? "ADMIN" : "STAFF");
        }
        return new ChatMessageResponse(message.getId(), sender == null ? null : sender.getId(),
                sender == null ? null : sender.getFullName(), role, message.getContent(),
                message.getMessageType(), message.getCreatedAt());
    }

    private ChatBookingResponse bookingResponse(Booking booking) {
        if (booking == null) return null;
        var showtime = booking.getShowtime();
        var room = showtime.getRoom();
        var payment = paymentRepository.findByBookingId(booking.getId()).orElse(null);
        var seats = booking.getBookingSeats().stream()
                .map(item -> item.getSeat().getRow() + item.getSeat().getNumber())
                .sorted(Comparator.naturalOrder()).toList();
        return new ChatBookingResponse(booking.getId(), booking.getBookingCode(), showtime.getMovie().getTitle(),
                showtime.getMovie().getPosterUrl(), room.getCinema().getName(), room.getName(), showtime.getStartTime(),
                seats, booking.getTotalAmount(), booking.getStatus(), payment == null ? null : payment.getMethod(),
                payment == null ? null : payment.getStatus());
    }

    private void requireCanView(ChatConversation conversation, User user) {
        if (hasRole(user, "ADMIN")) return;
        if (hasRole(user, "CUSTOMER") && conversation.getCustomer().getId().equals(user.getId())) return;
        if (hasRole(user, "STAFF") && user.getCinema() != null &&
                conversation.getCinema().getId().equals(user.getCinema().getId())) return;
        throw new AccessDeniedException("Không có quyền xem cuộc trò chuyện này");
    }

    private void requireCanSend(ChatConversation conversation, User sender) {
        if (hasRole(sender, "ADMIN")) return;
        if (hasRole(sender, "CUSTOMER")) {
            if (conversation.getCustomer().getId().equals(sender.getId())) return;
            throw new AccessDeniedException("Không có quyền gửi tin nhắn vào cuộc trò chuyện này");
        }
        requireSameCinema(conversation, sender);
        if (conversation.getAssignedStaff() == null || !conversation.getAssignedStaff().getId().equals(sender.getId())) {
            throw new AccessDeniedException("Cuộc trò chuyện chưa được giao cho bạn");
        }
    }

    private void requireSameCinema(ChatConversation conversation, User staff) {
        if (!hasRole(staff, "STAFF") || staff.getCinema() == null ||
                !conversation.getCinema().getId().equals(staff.getCinema().getId())) {
            throw new AccessDeniedException("Cuộc trò chuyện không thuộc rạp của bạn");
        }
    }

    private void requireBookingOwner(Booking booking, User user) {
        if (!booking.getUser().getId().equals(user.getId())) {
            throw new AccessDeniedException("Booking không thuộc tài khoản của bạn");
        }
    }

    private User currentUser() {
        return userRepository.findByEmail(CurrentUser.email())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng hiện tại"));
    }

    private ChatConversation conversation(Long id) {
        return conversationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy cuộc trò chuyện"));
    }

    private ChatConversation lockedConversation(Long id) {
        return conversationRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy cuộc trò chuyện"));
    }

    private ChatMessage addTextMessage(ChatConversation conversation, User sender, String content,
                                       String clientMessageId, LocalDateTime createdAt) {
        var message = messageRepository.save(ChatMessage.builder().conversation(conversation).sender(sender).content(content)
                .clientMessageId(clientMessageId)
                .messageType(ChatMessageType.TEXT).createdAt(createdAt).build());
        var senderRole = sender.getId().equals(conversation.getCustomer().getId())
                ? "CUSTOMER" : (hasRole(sender, "ADMIN") ? "ADMIN" : "STAFF");
        conversation.setLastMessageId(message.getId());
        conversation.setLastMessageContent(content.length() <= 500 ? content : content.substring(0, 500));
        conversation.setLastMessageSenderRole(senderRole);
        if ("CUSTOMER".equals(senderRole)) {
            if (conversation.getAssignedStaff() == null) {
                conversation.setQueueUnreadCount(conversation.getQueueUnreadCount() + 1);
            } else {
                readReceiptRepository.incrementUnread(conversation.getId(), conversation.getAssignedStaff().getId());
            }
        } else {
            conversation.setCustomerUnreadCount(conversation.getCustomerUnreadCount() + 1);
        }
        return message;
    }

    private SendChatMessageResponse sentMessageResponse(ChatConversation conversation, ChatMessage message) {
        return new SendChatMessageResponse(
                conversation.getId(), conversation.getVersion(), conversation.getLastMessageId(),
                conversation.getLastMessageAt(), conversation.getLastMessageContent(),
                messageResponse(message, conversation));
    }

    private void prepareStaffAssignment(ChatConversation conversation, User staff) {
        var state = readReceiptRepository.find(conversation.getId(), staff.getId()).orElse(null);
        var lastReadMessageId = state == null ? null : state.lastReadMessageId();
        var unread = (int) messageRepository.countStaffUnreadAfter(conversation.getId(),
                conversation.getCustomer().getId(), lastReadMessageId == null ? 0L : lastReadMessageId);
        readReceiptRepository.save(conversation.getId(), staff.getId(), lastReadMessageId, unread,
                state == null ? null : state.readAt());
        conversation.setQueueUnreadCount(0);
    }

    private ChatMessage addSystemMessage(ChatConversation conversation, String content) {
        return messageRepository.save(ChatMessage.builder().conversation(conversation).content(content)
                .messageType(ChatMessageType.SYSTEM).createdAt(LocalDateTime.now()).build());
    }

    private boolean hasRole(User user, String role) {
        return user.getUserRoles().stream()
                .anyMatch(item -> role.equalsIgnoreCase(item.getRole().getName()));
    }

    private BusinessException business(String message) {
        return new BusinessException(ErrorCode.BUSINESS_ERROR, message);
    }

    private PageRequest page(int requestedSize) {
        return PageRequest.of(0, Math.max(1, Math.min(requestedSize, 100)));
    }

    private CursorPosition decodeCursor(String cursor) {
        if (cursor == null || cursor.isBlank()) return new CursorPosition(null, null);
        try {
            var decoded = new String(Base64.getUrlDecoder().decode(cursor), StandardCharsets.UTF_8);
            var separator = decoded.lastIndexOf('|');
            if (separator < 1) throw new IllegalArgumentException();
            return new CursorPosition(LocalDateTime.parse(decoded.substring(0, separator)),
                    Long.parseLong(decoded.substring(separator + 1)));
        } catch (RuntimeException exception) {
            throw business("Cursor phân trang không hợp lệ");
        }
    }

    private String encodeCursor(LocalDateTime time, Long id) {
        var value = time + "|" + id;
        return Base64.getUrlEncoder().withoutPadding()
                .encodeToString(value.getBytes(StandardCharsets.UTF_8));
    }

    private record CursorPosition(LocalDateTime time, Long id) {
    }

    private void enqueueEvent(ChatConversation conversation, String type, ChatMessage message) {
        enqueueEvent(conversation, type, message, null, null, null, null);
    }

    private void enqueueEvent(ChatConversation conversation, String type, ChatMessage message,
                              Long readerId, String readerRole, Long lastReadMessageId,
                              LocalDateTime readAt) {
        conversationRepository.flush();
        var customerTotalUnread = conversationRepository.sumCustomerUnread(conversation.getCustomer().getId());
        var assignedStaff = conversation.getAssignedStaff();
        var assignedState = assignedStaff == null ? null
                : readReceiptRepository.find(conversation.getId(), assignedStaff.getId()).orElse(null);
        var event = ChatEventResponse.delta(type, summary(conversation, null, assignedState),
                message == null ? null : messageResponse(message, conversation),
                conversation.getCustomerUnreadCount(), assignedState == null ? 0 : assignedState.unreadCount(),
                conversation.getQueueUnreadCount(), customerTotalUnread, 0,
                readerId, readerRole, lastReadMessageId, readAt);
        eventPublisher.conversationChanged(conversation, event);
    }
}
