package com.peekle.domain.user.controller;

import com.peekle.domain.user.dto.ExtensionStatusResponse;
import com.peekle.domain.user.dto.TokenValidationRequest;
import com.peekle.domain.user.dto.TokenValidationResponse;
import com.peekle.domain.user.dto.UserProfileResponse;
import com.peekle.domain.user.service.UserService;
import com.peekle.global.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.regex.Pattern;

import com.peekle.domain.user.repository.UserRepository;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/users")
public class UserController {
    private final UserService userService;
    private final UserRepository userRepository;

    @GetMapping("/me")
    public ApiResponse<Map<String, Object>> getCurrentUser(@AuthenticationPrincipal Long userId) {

        Map<String, Object> userInfo = userService.getUserInfo(userId);
        return ApiResponse.success(userInfo);
    }

    @PostMapping("/me/extension-token")
    public ApiResponse<Map<String, String>> generateExtensionToken(
            @AuthenticationPrincipal Long userId,
            @RequestParam(defaultValue = "false") boolean regenerate) {
        String token = userService.generateExtensionToken(userId, regenerate);
        Map<String, String> response = new HashMap<>();
        response.put("extensionToken", token);
        return ApiResponse.success(response);
    }

    @GetMapping("/{nickname}/profile")
    public ApiResponse<UserProfileResponse> getUserProfileByNickname(
            @PathVariable String nickname,
            @AuthenticationPrincipal Long currentUserId) {
        UserProfileResponse response = userService.getUserProfileByNickname(nickname, currentUserId);
        return ApiResponse.success(response);
    }

    @GetMapping("/me/profile")
    public ApiResponse<UserProfileResponse> getMyProfile(@AuthenticationPrincipal Long userId) {
        // 자신의 프로필 조회 (isMe = true)
        UserProfileResponse response = userService.getUserProfile(userId, userId);
        return ApiResponse.success(response);
    }

    @PostMapping("/me/validate-token")
    public ApiResponse<TokenValidationResponse> validateToken(
            @AuthenticationPrincipal Long userId,
            @RequestBody TokenValidationRequest request) {

        boolean isValidUserToken = userService.validateExtensionToken(userId, request.token());
        return ApiResponse.success(new TokenValidationResponse(isValidUserToken));
    }

    @GetMapping("/me/streak")
    public ApiResponse<java.util.List<com.peekle.domain.user.dto.ActivityStreakDto>> getActivityStreak(
            @AuthenticationPrincipal Long userId) {
        return ApiResponse.success(userService.getUserActivityStreak(userId));
    }

    @GetMapping("/check-nickname")
    public ApiResponse<Map<String, Object>> checkNickname(@RequestParam String nickname) {
        // 닉네임 형식 검증: 2~12자, 한글/영문/숫자만 허용
        Pattern pattern = Pattern.compile("^[가-힣a-zA-Z0-9]{2,12}$");
        if (!pattern.matcher(nickname).matches()) {
            return ApiResponse.success(Map.of(
                    "available", false,
                    "message", "닉네임은 2~12자, 한글/영문/숫자만 사용할 수 있습니다."
            ));
        }

        // 중복 검증
        boolean exists = userRepository.findByNickname(nickname).isPresent();
        if (exists) {
            return ApiResponse.success(Map.of(
                    "available", false,
                    "message", "이미 사용중인 닉네임입니다."
            ));
        }

        return ApiResponse.success(Map.of(
                "available", true,
                "message", "사용 가능한 닉네임입니다."
        ));
    }
    @GetMapping("/me/timeline")
    public ApiResponse<java.util.List<com.peekle.domain.user.dto.TimelineItemDto>> getDailyTimeline(
            @AuthenticationPrincipal Long userId,
            @RequestParam String date) {
        return ApiResponse.success(userService.getDailyTimeline(userId, date));
    }
    
    @GetMapping("/me/extension-status")
    public ApiResponse<com.peekle.domain.user.dto.ExtensionStatusResponse> getExtensionStatus(
            @AuthenticationPrincipal Long userId) {
        return ApiResponse.success(userService.getExtensionStatus(userId));
    }
}

