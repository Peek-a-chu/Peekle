package com.peekle.domain.search.controller;

import com.peekle.domain.search.dto.SearchRequest;
import com.peekle.domain.search.dto.SearchResponse;
import com.peekle.domain.search.service.SearchService;
import com.peekle.global.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/search")
public class SearchController {

    private final SearchService searchService;

    @GetMapping
    public ApiResponse<SearchResponse> search(
            @ModelAttribute SearchRequest request,
            @PageableDefault(size = 20) Pageable pageable) {
        return ApiResponse.success(searchService.search(request, pageable));
    }
}
