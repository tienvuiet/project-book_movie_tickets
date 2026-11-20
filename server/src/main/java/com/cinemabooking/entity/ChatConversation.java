package com.cinemabooking.entity;

import com.cinemabooking.enums.ChatConversationStatus;
import com.cinemabooking.enums.ChatSourcePage;
import com.cinemabooking.enums.ChatSubject;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "chat_conversations")
public class ChatConversation {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "customer_id", nullable = false)
    private User customer;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "cinema_id", nullable = false)
    private Cinema cinema;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id")
    private Booking booking;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_staff_id")
    private User assignedStaff;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ChatSubject subject;

    @Enumerated(EnumType.STRING)
    @Column(name = "source_page", nullable = false, length = 30)
    private ChatSourcePage sourcePage;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ChatConversationStatus status;

    @Column(name = "last_message_at", nullable = false)
    private LocalDateTime lastMessageAt;

    @Column(name = "last_message_id")
    private Long lastMessageId;

    @Column(name = "last_message_content", length = 500)
    private String lastMessageContent;

    @Column(name = "last_message_sender_role", length = 20)
    private String lastMessageSenderRole;

    @Column(name = "customer_unread_count", nullable = false)
    private int customerUnreadCount;

    @Column(name = "staff_unread_count", nullable = false)
    private int staffUnreadCount;

    @Column(name = "queue_unread_count", nullable = false)
    private int queueUnreadCount;

    @Column(name = "read_state_updated_at")
    private LocalDateTime readStateUpdatedAt;

    @Column(name = "customer_last_read_message_id")
    private Long customerLastReadMessageId;

    @Column(name = "staff_last_read_message_id")
    private Long staffLastReadMessageId;

    @Column(name = "customer_read_at")
    private LocalDateTime customerReadAt;

    @Column(name = "staff_read_at")
    private LocalDateTime staffReadAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    @Column(name = "closed_at")
    private LocalDateTime closedAt;

    @Version
    private Long version;

    @PrePersist
    void prePersist() {
        var now = LocalDateTime.now();
        if (status == null) status = ChatConversationStatus.WAITING;
        if (createdAt == null) createdAt = now;
        if (lastMessageAt == null) lastMessageAt = now;
    }
}
