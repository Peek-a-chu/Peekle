package com.peekle.domain.study.repository;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.peekle.domain.study.dto.chat.ChatMessageResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.BatchPreparedStatementSetter;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.List;

@Slf4j
@Repository
@RequiredArgsConstructor
public class ChatJdbcRepository {

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    /**
     * Bulk Insert Chat Logs
     * Note: "parent_id" references study_chat_logs(id).
     * If parent is also in this batch, it might fail due to FK if not ordered or if
     * IDs are not pre-generated.
     * For now, we assume parent refers to an already existing log (persisted in
     * DB).
     */
    public void batchInsertChatLogs(List<ChatMessageResponse> chatLogs) {
        String sql = "INSERT INTO study_chat_logs (study_room_id, user_id, message, type, parent_id, metadata, created_at) "
                +
                "VALUES (?, ?, ?, ?, ?, ?, ?)";

        jdbcTemplate.batchUpdate(sql, new BatchPreparedStatementSetter() {
            @Override
            public void setValues(PreparedStatement ps, int i) throws SQLException {
                ChatMessageResponse chat = chatLogs.get(i);
                ps.setLong(1, chat.getStudyId());
                ps.setLong(2, chat.getSenderId());
                ps.setString(3, chat.getContent());
                ps.setString(4, chat.getType().name());

                if (chat.getParentId() != null) {
                    ps.setLong(5, chat.getParentId());
                } else {
                    ps.setNull(5, java.sql.Types.BIGINT);
                }

                String metadataJson = null;
                if (chat.getMetadata() != null) {
                    try {
                        metadataJson = objectMapper.writeValueAsString(chat.getMetadata());
                    } catch (Exception e) {
                        log.error("JSON Serialize Error", e);
                    }
                }
                ps.setString(6, metadataJson);

                // LocalDateTime to Timestamp
                if (chat.getCreatedAt() != null) {
                    ps.setTimestamp(7, Timestamp.valueOf(chat.getCreatedAt()));
                } else {
                    ps.setTimestamp(7, new Timestamp(System.currentTimeMillis()));
                }
            }

            @Override
            public int getBatchSize() {
                return chatLogs.size();
            }
        });
    }
}
