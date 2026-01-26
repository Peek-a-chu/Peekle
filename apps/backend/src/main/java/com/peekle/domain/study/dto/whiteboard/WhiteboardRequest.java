package com.peekle.domain.study.dto.whiteboard;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.ToString;

@Getter
@NoArgsConstructor
@ToString
public class WhiteboardRequest {
    private String type; //
    private Object data; // Fabric.js JSON 데이터 (좌표, 색상 등)
}
