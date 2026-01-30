package com.peekle.domain.user.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ExtensionStatusResponse {
    private Integer streakCurrent;
    private Boolean isSolvedToday;
}
