package com.peekle.domain.workbook.dto.request;

import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

@Getter
@NoArgsConstructor
public class WorkbookCreateRequest {
    private String title;
    private String description;
    private List<Long> problemIds; // Problem 엔티티의 ID 목록
}
