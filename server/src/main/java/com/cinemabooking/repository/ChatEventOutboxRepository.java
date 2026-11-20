package com.cinemabooking.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Repository
@RequiredArgsConstructor
public class ChatEventOutboxRepository {
    private final NamedParameterJdbcTemplate jdbcTemplate;

    public record OutboxRecord(Long id, String eventId, String payload, int attempts) {
    }

    public void enqueue(String eventId, String payload) {
        jdbcTemplate.update("""
                INSERT INTO chat_event_outbox (event_id, payload)
                VALUES (:eventId, :payload)
                """, new MapSqlParameterSource().addValue("eventId", eventId).addValue("payload", payload));
    }

    @Transactional
    public List<OutboxRecord> claimBatch(String workerId, int requestedSize) {
        jdbcTemplate.update("""
                UPDATE chat_event_outbox
                SET status = 'PENDING', claimed_by = NULL, claimed_at = NULL
                WHERE status = 'PROCESSING'
                  AND claimed_at < :staleBefore
                """, new MapSqlParameterSource("staleBefore", LocalDateTime.now().minusMinutes(1)));

        jdbcTemplate.update("""
                UPDATE chat_event_outbox
                SET status = 'PROCESSING', claimed_by = :workerId, claimed_at = CURRENT_TIMESTAMP(6)
                WHERE status = 'PENDING' AND next_attempt_at <= CURRENT_TIMESTAMP(6)
                ORDER BY id
                LIMIT :batchSize
                """, new MapSqlParameterSource().addValue("workerId", workerId)
                .addValue("batchSize", Math.max(1, Math.min(requestedSize, 100))));

        return jdbcTemplate.query("""
                SELECT id, event_id, payload, attempts
                FROM chat_event_outbox
                WHERE status = 'PROCESSING' AND claimed_by = :workerId
                ORDER BY id
                """, new MapSqlParameterSource("workerId", workerId),
                (rs, rowNum) -> new OutboxRecord(rs.getLong("id"), rs.getString("event_id"),
                        rs.getString("payload"), rs.getInt("attempts")));
    }

    public void markPublished(Long id, String workerId) {
        jdbcTemplate.update("""
                DELETE FROM chat_event_outbox
                WHERE id = :id AND status = 'PROCESSING' AND claimed_by = :workerId
                """, params(id, workerId));
    }

    public void retryLater(Long id, String workerId, int attempts) {
        var delaySeconds = Math.min(60, 1L << Math.min(attempts, 6));
        jdbcTemplate.update("""
                UPDATE chat_event_outbox
                SET status = 'PENDING', attempts = attempts + 1,
                    next_attempt_at = :nextAttemptAt, claimed_by = NULL, claimed_at = NULL
                WHERE id = :id AND status = 'PROCESSING' AND claimed_by = :workerId
                """, params(id, workerId).addValue("nextAttemptAt", LocalDateTime.now().plusSeconds(delaySeconds)));
    }

    public void markDead(Long id, String workerId) {
        jdbcTemplate.update("""
                UPDATE chat_event_outbox
                SET status = 'DEAD', claimed_by = NULL, claimed_at = NULL
                WHERE id = :id AND status = 'PROCESSING' AND claimed_by = :workerId
                """, params(id, workerId));
    }

    private MapSqlParameterSource params(Long id, String workerId) {
        return new MapSqlParameterSource().addValue("id", id).addValue("workerId", workerId);
    }
}
