package com.peekle.domain.study.dto.whiteboard;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class WhiteboardResponse {
    private String type;
    private Long senderId;
    private String senderName;
    private Object data;
    private LocalDateTime timestamp;

    public static WhiteboardResponse from(WhiteboardRequest request, Long userId, String senderName) {
        return WhiteboardResponse.builder()
                .type(request.getType())
                .senderId(userId)
                .senderName(senderName)
                .data(request.getData())
                .timestamp(LocalDateTime.now())
                .build();
    }
}
