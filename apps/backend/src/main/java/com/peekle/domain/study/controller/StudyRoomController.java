package com.peekle.domain.study.controller;

import com.peekle.domain.study.dto.request.StudyRoomCreateRequest;
import com.peekle.domain.study.dto.request.StudyRoomJoinRequest;
import com.peekle.domain.study.dto.response.StudyInviteCodeResponse;
import com.peekle.domain.study.dto.response.StudyRoomCreateResponse;
import com.peekle.domain.study.dto.response.StudyRoomResponse;
import com.peekle.domain.study.service.StudyRoomService;
import com.peekle.global.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
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
            Principal principal) {
        Long userId = 1L; // Test User ID
        StudyRoomCreateResponse response = studyRoomService.createStudyRoom(userId, request);
        return ApiResponse.success(response);
    }

    // 스터디 방 참여 (초대코드 사용)
    @PostMapping("/join")
    public ApiResponse<StudyRoomResponse> joinStudyRoom(
            @RequestBody StudyRoomJoinRequest request,
            Principal principal) {
        Long userId = 1L; // Test User ID
        StudyRoomResponse response = studyRoomService.joinStudyRoom(userId, request);
        return ApiResponse.success(response);
    }

    // 스터디 방 상세 조회
    @GetMapping("/{studyId}")
    public ApiResponse<StudyRoomResponse> getStudyRoom(
            @PathVariable Long studyId,
            Principal principal) {
        Long userId = 1L; // Test User ID
        StudyRoomResponse response = studyRoomService.getStudyRoom(userId, studyId);
        return ApiResponse.success(response);
    }

    // 스터디 방 초대코드 생성 (방에 참여한 사람만 가능)
    @PostMapping("/{studyId}/invite")
    public ApiResponse<StudyInviteCodeResponse> generateInviteCode(
            @PathVariable Long studyId,
            Principal principal) {
        Long userId = 1L; // Test User ID
        StudyInviteCodeResponse response = studyRoomService.createInviteCode(userId, studyId);
        return ApiResponse.success(response);
    }
}
