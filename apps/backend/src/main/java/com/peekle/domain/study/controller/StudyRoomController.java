package com.peekle.domain.study.controller;

import com.peekle.domain.study.dto.http.request.StudyRoomCreateRequest;
import com.peekle.domain.study.dto.http.request.StudyRoomJoinRequest;
import com.peekle.domain.study.dto.http.response.StudyInviteCodeResponse;
import com.peekle.domain.study.dto.http.response.StudyRoomCreateResponse;
import com.peekle.domain.study.dto.http.response.StudyRoomListResponse;
import com.peekle.domain.study.dto.http.response.StudyRoomResponse;
import com.peekle.domain.study.service.StudyRoomService;
import com.peekle.global.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/studies")
public class StudyRoomController {

    private final StudyRoomService studyRoomService;

    // 스터디 방 생성 (초대코드 반환)
    @PostMapping
    public ApiResponse<StudyRoomCreateResponse> createStudyRoom(
            @RequestBody StudyRoomCreateRequest request,
            @RequestHeader(value = "X-User-Id", required = false, defaultValue = "1") Long userId) {
        // userId from header or default 1

        StudyRoomCreateResponse response = studyRoomService.createStudyRoom(userId, request);
        return ApiResponse.success(response);
    }

    // 스터디 방 참여 (초대코드 사용)
    @PostMapping("/join")
    public ApiResponse<StudyRoomResponse> joinStudyRoom(
            @RequestBody StudyRoomJoinRequest request,
            @RequestHeader(value = "X-User-Id", required = false, defaultValue = "1") Long userId) {

        StudyRoomResponse response = studyRoomService.joinStudyRoom(userId, request);
        return ApiResponse.success(response);
    }

    // 내 스터디 목록 조회
    @GetMapping
    public ApiResponse<Page<StudyRoomListResponse>> getMyStudyRooms(
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 6) Pageable pageable,
            @RequestHeader(value = "X-User-Id", required = false, defaultValue = "1") Long userId) {

        Page<StudyRoomListResponse> response = studyRoomService.getMyStudyRooms(userId, keyword, pageable);
        return ApiResponse.success(response);
    }

    // 스터디 방 상세 조회
    @GetMapping("/{studyId}")
    public ApiResponse<StudyRoomResponse> getStudyRoom(
            @PathVariable Long studyId,
            @RequestHeader(value = "X-User-Id", required = false, defaultValue = "1") Long userId) {

        StudyRoomResponse response = studyRoomService.getStudyRoom(userId, studyId);
        return ApiResponse.success(response);
    }

    // 스터디 방 초대코드 생성 (방에 참여한 사람만 가능)
    @PostMapping("/{studyId}/invite")
    public ApiResponse<StudyInviteCodeResponse> generateInviteCode(
            @PathVariable Long studyId,
            @RequestHeader(value = "X-User-Id", required = false, defaultValue = "1") Long userId) {

        StudyInviteCodeResponse response = studyRoomService.createInviteCode(userId, studyId);
        return ApiResponse.success(response);
    }

}
