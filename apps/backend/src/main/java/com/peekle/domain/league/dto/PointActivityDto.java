package com.peekle.domain.league.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

import com.peekle.domain.point.enums.PointCategory;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PointActivityDto {
    private String description;
    private int amount;
    private LocalDateTime createdAt;
    private PointCategory category;
}
