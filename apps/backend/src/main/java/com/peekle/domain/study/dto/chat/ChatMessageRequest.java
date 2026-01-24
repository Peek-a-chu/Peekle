package com.peekle.domain.study.dto.chat;

import com.peekle.domain.study.entity.StudyChatLog.ChatType;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.ToString;

import java.util.Map;

@Getter
@NoArgsConstructor
@ToString
public class ChatMessageRequest {
    private String content;
    private ChatType type;
    private Long parentId;
    private Map<String, Object> metadata;

    @Builder
    public ChatMessageRequest(String content, ChatType type, Long parentId, Map<String, Object> metadata) {
        this.content = content;
        this.type = type != null ? type : ChatType.TALK;
        this.parentId = parentId;
        this.metadata = metadata;
    }
}
