package com.peekle.domain.study.controller;

import com.peekle.domain.study.dto.http.request.StudyRoomCreateRequest;
import com.peekle.domain.study.dto.http.request.StudyRoomJoinRequest;
import com.peekle.domain.study.dto.http.response.StudyInviteCodeResponse;
import com.peekle.domain.study.dto.http.response.StudyRoomCreateResponse;
import com.peekle.domain.study.dto.http.response.StudyRoomListResponse;
import com.peekle.domain.study.dto.http.response.StudyRoomResponse;
import com.peekle.domain.study.service.StudyRoomService;
import com.peekle.domain.submission.dto.SubmissionRequest;
import com.peekle.domain.submission.dto.SubmissionResponse;
import com.peekle.global.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/studies")
public class StudyRoomController {

    private final StudyRoomService studyRoomService;

    // 스터디 방 생성 (초대코드 반환)
    @PostMapping
    public ApiResponse<StudyRoomCreateResponse> createStudyRoom(
            @RequestBody StudyRoomCreateRequest request,
            @AuthenticationPrincipal Long userId) {
        // userId from header or default 1

        StudyRoomCreateResponse response = studyRoomService.createStudyRoom(userId, request);
        return ApiResponse.success(response);
    }

    // 스터디 방 참여 (초대코드 사용)
    @PostMapping("/join")
    public ApiResponse<StudyRoomResponse> joinStudyRoom(
            @RequestBody StudyRoomJoinRequest request,
            @AuthenticationPrincipal Long userId) {

        StudyRoomResponse response = studyRoomService.joinStudyRoom(userId, request);
        return ApiResponse.success(response);
    }

    // 스터디 문제 제출 (가상의 submitStudyProblem 메서드 추가)
    // 이 메서드는 요청에 따라 새로 추가된 것으로 가정합니다.
    @PostMapping("/{studyId}/submit")
    public ApiResponse<SubmissionResponse> submitStudyProblem(
            @PathVariable Long studyId,
            @RequestBody SubmissionRequest request, // Assuming SubmissionRequest DTO exists
            Principal principal) {
        System.out.println("[DEBUG] Received Study Specific Submission for Study: " + studyId);
        System.out.println("[DEBUG] Request: " + request);

        // Assuming studyRoomService has a submitStudyProblem method
        // And SubmissionResponse DTO exists
        SubmissionResponse response = studyRoomService.submitStudyProblem(studyId, request);
        return ApiResponse.success(response);
    }

    // 내 스터디 목록 조회
    @GetMapping
    public ApiResponse<Page<StudyRoomListResponse>> getMyStudyRooms(
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 6) Pageable pageable,
            @AuthenticationPrincipal Long userId) {

        Page<StudyRoomListResponse> response = studyRoomService.getMyStudyRooms(userId, keyword, pageable);
        return ApiResponse.success(response);
    }

    // 스터디 방 상세 조회
    @GetMapping("/{studyId}")
    public ApiResponse<StudyRoomResponse> getStudyRoom(
            @PathVariable Long studyId,
            @AuthenticationPrincipal Long userId) {

        StudyRoomResponse response = studyRoomService.getStudyRoom(userId, studyId);
        return ApiResponse.success(response);
    }

    // 스터디 방 초대코드 생성 (방에 참여한 사람만 가능)
    @PostMapping("/{studyId}/invite")
    public ApiResponse<StudyInviteCodeResponse> generateInviteCode(
            @PathVariable Long studyId,
            @AuthenticationPrincipal Long userId) {

        StudyInviteCodeResponse response = studyRoomService.createInviteCode(userId, studyId);
        return ApiResponse.success(response);
    }

}
