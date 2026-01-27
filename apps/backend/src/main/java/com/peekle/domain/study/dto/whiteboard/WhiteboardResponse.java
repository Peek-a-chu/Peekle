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
    // 1. 동작 구분 (Request와 동일)
    // 예: "ADDED", "MODIFIED", "REMOVED", "CURSOR"
    private String action;

    // 2. 객체 고유 ID (필수 추가!)
    // 다른 클라이언트가 "어떤 도형"을 고칠지 알아야 하므로 반드시 포함해야 합니다.
    private String objectId;

    // 3. Fabric.js 데이터 (좌표, 색상 등)
    private Object data;

    // 4. 보낸 사람 정보 (UI 표시용)
    private Long senderId;
    private String senderName;

    // 5. 서버 시간 (순서 동기화 참고용)
    private LocalDateTime timestamp;

    // Request -> Response 변환 메서드
    public static WhiteboardResponse from(WhiteboardRequest request, Long userId, String senderName) {
        return WhiteboardResponse.builder()
                .action(request.getAction())     // type -> action으로 매핑
                .objectId(request.getObjectId()) // request에서 ID를 꺼내 전달
                .data(request.getData())         // 데이터 그대로 전달
                .senderId(userId)
                .senderName(senderName)
                .timestamp(LocalDateTime.now())
                .build();
    }
}
