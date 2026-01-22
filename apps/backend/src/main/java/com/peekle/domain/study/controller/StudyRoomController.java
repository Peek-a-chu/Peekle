package com.peekle.domain.study.controller;

import com.peekle.domain.study.dto.request.StudyRoomCreateRequest;
import com.peekle.domain.study.dto.request.StudyRoomJoinRequest;
import com.peekle.domain.study.dto.response.StudyInviteCodeResponse;
import com.peekle.domain.study.dto.response.StudyRoomCreateResponse;
import com.peekle.domain.study.service.StudyRoomService;
import com.peekle.domain.user.entity.User;
import com.peekle.domain.user.repository.UserRepository;
import com.peekle.global.dto.ApiResponse;
import com.peekle.global.exception.BusinessException;
import com.peekle.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/studies")
public class StudyRoomController {

    private final StudyRoomService studyRoomService;
    private final UserRepository userRepository;

    @PostMapping
    public ApiResponse<StudyRoomCreateResponse> createStudyRoom(
            @RequestBody StudyRoomCreateRequest request,
            Principal principal) {
        User user = getUserFromPrincipal(principal);
        StudyRoomCreateResponse response = studyRoomService.createStudyRoom(user, request);
        return ApiResponse.success(response);
    }

    @PostMapping("/join")
    public ApiResponse<Void> joinStudyRoom(
            @RequestBody StudyRoomJoinRequest request,
            Principal principal) {
        User user = getUserFromPrincipal(principal);
        studyRoomService.joinStudyRoom(user, request);
        return ApiResponse.success();
    }

    @PostMapping("/{studyId}/invite")
    public ApiResponse<StudyInviteCodeResponse> generateInviteCode(
            @PathVariable Long studyId,
            Principal principal) {
        User user = getUserFromPrincipal(principal);
        StudyInviteCodeResponse response = studyRoomService.createInviteCode(user, studyId);
        return ApiResponse.success(response);
    }

    private User getUserFromPrincipal(Principal principal) {
        if (principal == null) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }
        try {
            // TODO: Auth 로직 확정 시 수정 필요 (현재는 ID or Nickname 추정)
            Long userId = Long.parseLong(principal.getName());
            return userRepository.findById(userId)
                    .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
        } catch (NumberFormatException e) {
            return userRepository.findByNickname(principal.getName())
                    .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
        }
    }
}
