package com.cinemabooking.repository;

import com.cinemabooking.entity.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    Optional<ChatMessage> findByConversationIdAndClientMessageId(Long conversationId, String clientMessageId);

    @Query("""
            select m from ChatMessage m
            left join fetch m.sender
            where m.conversation.id = :conversationId
              and (:beforeId is null or m.id < :beforeId)
            order by m.id desc
            """)
    Slice<ChatMessage> findMessagePage(@Param("conversationId") Long conversationId,
                                        @Param("beforeId") Long beforeId,
                                        Pageable pageable);

    @Query("""
            select count(m) from ChatMessage m
            where m.conversation.id = :conversationId
              and m.id > :lastReadMessageId
              and m.sender.id = :customerId
            """)
    long countStaffUnreadAfter(@Param("conversationId") Long conversationId,
                               @Param("customerId") Long customerId,
                               @Param("lastReadMessageId") Long lastReadMessageId);

    @Query("""
            select count(m) from ChatMessage m
            where m.conversation.id = :conversationId
              and m.id > :lastReadMessageId
              and m.sender is not null
              and m.sender.id <> :customerId
            """)
    long countCustomerUnreadAfter(@Param("conversationId") Long conversationId,
                                  @Param("customerId") Long customerId,
                                  @Param("lastReadMessageId") Long lastReadMessageId);
}
