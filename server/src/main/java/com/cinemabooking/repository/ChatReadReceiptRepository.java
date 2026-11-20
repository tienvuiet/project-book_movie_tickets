package com.cinemabooking.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

@Repository
@RequiredArgsConstructor
public class ChatReadReceiptRepository {
    private final NamedParameterJdbcTemplate jdbcTemplate;

    public record ReadState(Long conversationId, Long userId, Long lastReadMessageId,
                            int unreadCount, LocalDateTime readAt) {
    }

    public Optional<ReadState> find(Long conversationId, Long userId) {
        var rows = jdbcTemplate.query("""
                SELECT conversation_id, user_id, last_read_message_id, unread_count, read_at
                FROM chat_conversation_reads
                WHERE conversation_id = :conversationId AND user_id = :userId
                """, new MapSqlParameterSource().addValue("conversationId", conversationId).addValue("userId", userId),
                this::mapState);
        return rows.stream().findFirst();
    }

    public Map<Long, ReadState> findForUser(List<Long> conversationIds, Long userId) {
        if (conversationIds.isEmpty()) return Map.of();
        var rows = jdbcTemplate.query("""
                SELECT conversation_id, user_id, last_read_message_id, unread_count, read_at
                FROM chat_conversation_reads
                WHERE conversation_id IN (:conversationIds) AND user_id = :userId
                """, new MapSqlParameterSource().addValue("conversationIds", conversationIds).addValue("userId", userId),
                this::mapState);
        return rows.stream().collect(Collectors.toMap(ReadState::conversationId, Function.identity()));
    }

    public Map<Long, ReadState> findAssignedStates(List<Long> conversationIds) {
        if (conversationIds.isEmpty()) return Map.of();
        var rows = jdbcTemplate.query("""
                SELECT r.conversation_id, r.user_id, r.last_read_message_id, r.unread_count, r.read_at
                FROM chat_conversation_reads r
                JOIN chat_conversations c ON c.id = r.conversation_id
                    AND c.assigned_staff_id = r.user_id
                WHERE r.conversation_id IN (:conversationIds)
                """, new MapSqlParameterSource("conversationIds", conversationIds), this::mapState);
        return rows.stream().collect(Collectors.toMap(ReadState::conversationId, Function.identity()));
    }

    public void save(Long conversationId, Long userId, Long lastReadMessageId,
                     int unreadCount, LocalDateTime readAt) {
        jdbcTemplate.update("""
                INSERT INTO chat_conversation_reads
                    (conversation_id, user_id, last_read_message_id, unread_count, read_at, updated_at)
                VALUES (:conversationId, :userId, :lastReadMessageId, :unreadCount, :readAt, CURRENT_TIMESTAMP(6))
                ON DUPLICATE KEY UPDATE
                    last_read_message_id = VALUES(last_read_message_id),
                    unread_count = VALUES(unread_count),
                    read_at = VALUES(read_at),
                    updated_at = CURRENT_TIMESTAMP(6)
                """, params(conversationId, userId, lastReadMessageId, unreadCount, readAt));
    }

    public void incrementUnread(Long conversationId, Long userId) {
        jdbcTemplate.update("""
                INSERT INTO chat_conversation_reads
                    (conversation_id, user_id, last_read_message_id, unread_count, read_at, updated_at)
                VALUES (:conversationId, :userId, NULL, 1, NULL, CURRENT_TIMESTAMP(6))
                ON DUPLICATE KEY UPDATE
                    unread_count = unread_count + 1,
                    updated_at = CURRENT_TIMESTAMP(6)
                """, new MapSqlParameterSource().addValue("conversationId", conversationId).addValue("userId", userId));
    }

    public long totalUnread(Long staffId, Long cinemaId) {
        var value = jdbcTemplate.queryForObject("""
                SELECT
                    COALESCE((
                        SELECT SUM(r.unread_count)
                        FROM chat_conversation_reads r
                        JOIN chat_conversations c ON c.id = r.conversation_id
                        WHERE r.user_id = :staffId AND c.assigned_staff_id = :staffId
                            AND c.cinema_id = :cinemaId
                    ), 0)
                    + COALESCE((
                        SELECT SUM(c.queue_unread_count)
                        FROM chat_conversations c
                        WHERE c.cinema_id = :cinemaId AND c.assigned_staff_id IS NULL
                    ), 0)
                """, new MapSqlParameterSource().addValue("staffId", staffId).addValue("cinemaId", cinemaId), Long.class);
        return value == null ? 0 : value;
    }

    public Map<Long, Long> totalUnreadByStaff(Collection<Long> staffIds, Long cinemaId) {
        if (staffIds.isEmpty()) return Map.of();
        var rows = jdbcTemplate.query("""
                SELECT u.id AS staff_id,
                    COALESCE(SUM(CASE
                        WHEN c.id IS NOT NULL THEN r.unread_count
                        ELSE 0
                    END), 0)
                    + COALESCE((
                        SELECT SUM(q.queue_unread_count)
                        FROM chat_conversations q
                        WHERE q.cinema_id = :cinemaId AND q.assigned_staff_id IS NULL
                    ), 0) AS total_unread
                FROM users u
                LEFT JOIN chat_conversation_reads r ON r.user_id = u.id
                LEFT JOIN chat_conversations c ON c.id = r.conversation_id
                    AND c.assigned_staff_id = u.id
                    AND c.cinema_id = :cinemaId
                WHERE u.id IN (:staffIds)
                GROUP BY u.id
                """, new MapSqlParameterSource().addValue("staffIds", staffIds).addValue("cinemaId", cinemaId),
                (rs, rowNum) -> Map.entry(rs.getLong("staff_id"), rs.getLong("total_unread")));
        return rows.stream().collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
    }

    private MapSqlParameterSource params(Long conversationId, Long userId, Long lastReadMessageId,
                                         int unreadCount, LocalDateTime readAt) {
        return new MapSqlParameterSource().addValue("conversationId", conversationId).addValue("userId", userId)
                .addValue("lastReadMessageId", lastReadMessageId).addValue("unreadCount", unreadCount)
                .addValue("readAt", readAt);
    }

    private ReadState mapState(ResultSet rs, int rowNum) throws SQLException {
        return new ReadState(rs.getLong("conversation_id"), rs.getLong("user_id"),
                rs.getObject("last_read_message_id", Long.class), rs.getInt("unread_count"),
                rs.getObject("read_at", LocalDateTime.class));
    }
}
