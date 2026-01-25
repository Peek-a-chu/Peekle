package com.peekle.domain.study.controller;

import com.peekle.domain.study.dto.ide.IdeResponse;
import com.peekle.domain.study.service.RedisIdeService;
import com.peekle.global.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/studies")
public class CollaborationController {

    private final RedisIdeService redisIdeService;

    /**
     * Get Code Snapshot (Init / Refresh)
     */
    @GetMapping("/{studyId}/ide/{userId}")
    public ApiResponse<IdeResponse> getIdeCode(
            @PathVariable Long studyId,
            @PathVariable Long userId) {

        IdeResponse response = redisIdeService.getCode(studyId, userId);
        return ApiResponse.success(response);
    }
}
