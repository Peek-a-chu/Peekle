package com.peekle.domain.study.dto.socket.response;

import lombok.Builder;
import lombok.Getter;

// 공통 알림 메시지 포맷
@Getter
@Builder
public class SocketResponse<T> {
    private String type; // INFO, LEADER, ENTER, LEAVE, KICK
    private T data; // 실제 데이터 (User 정보, Study 정보 등)

    public static <T> SocketResponse<T> of(String type, T data) {
        return SocketResponse.<T>builder()
                .type(type)
                .data(data)
                .build();
    }
}