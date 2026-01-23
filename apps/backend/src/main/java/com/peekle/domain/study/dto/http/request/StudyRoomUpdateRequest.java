package com.peekle.domain.study.dto.http.request;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
public class StudyRoomUpdateRequest {
    private String title;
    private String description;
}
