package com.peekle.domain.study.dto.ide;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.ToString;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@ToString
public class IdeWatchRequest {
    private Long targetUserId; // Who am I watching?
    private String action; // "START" or "STOP"
}
