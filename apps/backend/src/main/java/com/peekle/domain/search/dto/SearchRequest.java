package com.peekle.domain.search.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@ToString
public class SearchRequest {

    private String keyword; // 검색어
    private String category; // ALL, PROBLEM, WORKBOOOK, USER

    // (문제검색용) 필터
    private List<String> tiers;
    private List<String> tags;

}
