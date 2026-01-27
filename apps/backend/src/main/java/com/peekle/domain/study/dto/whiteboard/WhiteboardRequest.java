package com.peekle.domain.study.dto.whiteboard;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.ToString;

@Getter
@NoArgsConstructor
@ToString
public class WhiteboardRequest {
    // 1. 동작 구분 (필수)
    // 값 예시: "ADDED"(추가), "MODIFIED"(수정), "REMOVED"(삭제), "CLEAR"(전체삭제)
    // 기존의 'type'은 도형 종류(rect)랑 헷갈리므로 'action'으로 명명하는 게 좋습니다.
    private String action;

    // 2. 객체 고유 ID (필수)
    // 프론트엔드에서 생성한 UUID (예: "obj-1234-5678")
    // 수정하거나 삭제할 때 이 ID를 보고 찾습니다.
    private String objectId;

    // 3. 데이터 (Payload)
    // ADD, MODIFIED 일 때만 데이터가 들어오고, REMOVED 일 때는 null일 수 있습니다.
    private Object data;
}
