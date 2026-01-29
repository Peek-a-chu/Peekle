package com.peekle.domain.workbook.controller;

import com.peekle.domain.workbook.dto.request.WorkbookCreateRequest;
import com.peekle.domain.workbook.dto.request.WorkbookUpdateRequest;
import com.peekle.domain.workbook.dto.response.WorkbookCountResponse;
import com.peekle.domain.workbook.dto.response.WorkbookListResponse;
import com.peekle.domain.workbook.dto.response.WorkbookResponse;
import com.peekle.domain.workbook.service.WorkbookService;
import com.peekle.global.dto.ApiResponse;
import com.peekle.global.exception.BusinessException;
import com.peekle.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/workbooks")
public class WorkbookController {

    private final WorkbookService workbookService;

    // 현재 로그인된 사용자 ID 가져오기 (인증되지 않은 경우 null 반환)
    private Long getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof Long) {
            return (Long) authentication.getPrincipal();
        }
        return null;
    }

    // 인증이 필요한 작업에서 사용자 ID를 가져오기 (인증되지 않은 경우 예외 발생)
    private Long requireUserId() {
        Long userId = getCurrentUserId();
        if (userId == null) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }
        return userId;
    }

    // 문제집 생성
    @PostMapping("/new")
    public ApiResponse<WorkbookResponse> createWorkbook(
            @RequestBody WorkbookCreateRequest request) {
        Long userId = requireUserId();
        WorkbookResponse response = workbookService.createWorkbook(userId, request);
        return ApiResponse.success(response);
    }

    // 문제집 목록 조회
    @GetMapping
    public ApiResponse<Page<WorkbookListResponse>> getWorkbooks(
            @RequestParam(defaultValue = "ALL") String tab,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "LATEST") String sort,
            @PageableDefault(size = 15) Pageable pageable) {
        Long userId = getCurrentUserId();
        Page<WorkbookListResponse> response = workbookService.getWorkbooks(userId, tab, keyword, sort, pageable);
        return ApiResponse.success(response);
    }

    // 탭별 개수 조회
    @GetMapping("/counts")
    public ApiResponse<WorkbookCountResponse> getWorkbookCounts() {
        Long userId = getCurrentUserId();
        WorkbookCountResponse response = workbookService.getWorkbookCounts(userId);
        return ApiResponse.success(response);
    }

    // 문제집 상세 조회
    @GetMapping("/{workbookId}")
    public ApiResponse<WorkbookResponse> getWorkbook(
            @PathVariable Long workbookId) {
        Long userId = getCurrentUserId();
        WorkbookResponse response = workbookService.getWorkbook(userId, workbookId);
        return ApiResponse.success(response);
    }

    // 문제집 수정
    @PutMapping("/{workbookId}")
    public ApiResponse<WorkbookResponse> updateWorkbook(
            @PathVariable Long workbookId,
            @RequestBody WorkbookUpdateRequest request) {
        Long userId = requireUserId();
        WorkbookResponse response = workbookService.updateWorkbook(userId, workbookId, request);
        return ApiResponse.success(response);
    }

    // 문제집 삭제
    @DeleteMapping("/{workbookId}")
    public ApiResponse<Void> deleteWorkbook(
            @PathVariable Long workbookId) {
        Long userId = requireUserId();
        workbookService.deleteWorkbook(userId, workbookId);
        return ApiResponse.success();
    }

    // 북마크 토글
    @PostMapping("/{workbookId}/bookmark")
    public ApiResponse<Map<String, Boolean>> toggleBookmark(
            @PathVariable Long workbookId) {
        Long userId = requireUserId();
        boolean isBookmarked = workbookService.toggleBookmark(userId, workbookId);
        return ApiResponse.success(Map.of("isBookmarked", isBookmarked));
    }
}
