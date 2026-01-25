package com.peekle.domain.study.dto.chat;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.peekle.domain.study.entity.StudyChatLog;
import com.peekle.domain.study.entity.StudyChatLog.ChatType;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.Map;

@Getter
public class ChatMessageResponse {
    private Long id;
    private Long studyId;
    private Long senderId;
    private String senderName;
    private String content;
    private ChatType type;
    private Long parentId;
    private Map<String, Object> metadata;
    private LocalDateTime createdAt;

    @Builder
    public ChatMessageResponse(Long id, Long studyId, Long senderId, String senderName, String content,
            ChatType type, Long parentId, Map<String, Object> metadata, LocalDateTime createdAt) {
        this.id = id;
        this.studyId = studyId;
        this.senderId = senderId;
        this.senderName = senderName;
        this.content = content;
        this.type = type;
        this.parentId = parentId;
        this.metadata = metadata;
        this.createdAt = createdAt;
    }

    public static ChatMessageResponse from(StudyChatLog chat) {
        Map<String, Object> metaMap = null;
        if (chat.getMetadata() != null) {
            try {
                @SuppressWarnings("unchecked")
                Map<String, Object> map = new ObjectMapper().readValue(chat.getMetadata(), Map.class);
                metaMap = map;
            } catch (Exception e) {
                // Ignore parsing error for simplified example
            }
        }

        return ChatMessageResponse.builder()
                .id(chat.getId())
                .studyId(chat.getStudy().getId())
                .senderId(chat.getUser().getId())
                .senderName(chat.getUser().getNickname())
                .content(chat.getMessage())
                .type(chat.getType())
                .parentId(chat.getParent() != null ? chat.getParent().getId() : null)
                .metadata(metaMap)
                .createdAt(chat.getCreatedAt())
                .build();
    }
}
