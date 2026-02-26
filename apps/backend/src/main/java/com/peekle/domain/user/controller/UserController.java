package com.peekle.domain.user.controller;

import com.peekle.domain.user.dto.ExtensionStatusResponse;
import com.peekle.domain.user.dto.TokenValidationRequest;
import com.peekle.domain.user.dto.TokenValidationResponse;
import com.peekle.domain.user.dto.UserProfileResponse;
import com.peekle.domain.user.dto.UserUpdateRequest;
import com.peekle.domain.user.service.UserService;
import com.peekle.global.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Page;
import com.peekle.domain.submission.dto.SubmissionLogResponse;
import org.springframework.data.web.PageableDefault;

import java.util.HashMap;
import java.util.Map;
import java.util.regex.Pattern;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/users")
public class UserController {
    private final UserService userService;

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

    @PatchMapping("/me")
    public ApiResponse<Void> updateProfile(
            @AuthenticationPrincipal Long userId,
            @RequestBody UserUpdateRequest request) {
        userService.updateUserProfile(userId, request);
        return ApiResponse.success(null);
    }

    @PostMapping("/me/profile-image/presigned-url")
    public ApiResponse<Map<String, String>> getProfileImagePresignedUrl(
            @AuthenticationPrincipal Long userId,
            @RequestBody Map<String, String> request) {
        String fileName = request.get("fileName");
        String contentType = request.get("contentType");

        Map<String, String> urls = userService.getProfileImagePresignedUrl(userId, fileName, contentType);
        return ApiResponse.success(urls);
    }

    @PostMapping("/me/validate-token")
    public ApiResponse<TokenValidationResponse> validateToken(
            @AuthenticationPrincipal Long userId,
            @RequestBody TokenValidationRequest request) {

        boolean isValidUserToken = userService.validateExtensionToken(userId, request.token(), request.bojId());
        return ApiResponse.success(new TokenValidationResponse(isValidUserToken));
    }

    @GetMapping("/me/streak")
    public ApiResponse<java.util.List<com.peekle.domain.user.dto.ActivityStreakDto>> getActivityStreak(
            @AuthenticationPrincipal Long userId) {
        return ApiResponse.success(userService.getUserActivityStreak(userId));
    }

    @GetMapping("/{nickname}/streak")
    public ApiResponse<java.util.List<com.peekle.domain.user.dto.ActivityStreakDto>> getUserActivityStreak(
            @PathVariable String nickname) {
        return ApiResponse.success(userService.getUserActivityStreakByNickname(nickname));
    }

    @GetMapping("/check-nickname")
    public ApiResponse<Map<String, Object>> checkNickname(@RequestParam String nickname) {
        // 닉네임 형식 검증: 2~12자, 한글/영문/숫자만 허용
        Pattern pattern = Pattern.compile("^[가-힣a-zA-Z0-9]{2,12}$");
        if (!pattern.matcher(nickname).matches()) {
            return ApiResponse.success(Map.of(
                    "available", false,
                    "message", "닉네임은 2~12자, 한글/영문/숫자만 사용할 수 있습니다."));
        }

        // 중복 검증
        boolean exists = userService.existsByNickname(nickname);
        if (exists) {
            return ApiResponse.success(Map.of(
                    "available", false,
                    "message", "이미 사용중인 닉네임입니다."));
        }

        return ApiResponse.success(Map.of(
                "available", true,
                "message", "사용 가능한 닉네임입니다."));
    }

    @GetMapping("/check-boj-id")
    public ApiResponse<Map<String, Object>> checkBojId(@RequestParam String bojId) {
        // Validating format first (optional, but good practice)
        if (bojId == null || bojId.trim().isEmpty()) {
            return ApiResponse.success(Map.of(
                    "valid", false,
                    "message", "백준 아이디를 입력해주세요."));
        }

        boolean isValid = userService.validateBojId(bojId);

        if (isValid) {
            return ApiResponse.success(Map.of(
                    "valid", true,
                    "message", "확인되었습니다."));
        } else {
            return ApiResponse.success(Map.of(
                    "valid", false,
                    "message", "존재하지 않는 백준 아이디입니다."));
        }
    }

    @GetMapping("/me/timeline")
    public ApiResponse<java.util.List<com.peekle.domain.user.dto.TimelineItemDto>> getDailyTimeline(
            @AuthenticationPrincipal Long userId,
            @RequestParam String date) {
        return ApiResponse.success(userService.getDailyTimeline(userId, date));
    }

    @GetMapping("/{nickname}/timeline")
    public ApiResponse<java.util.List<com.peekle.domain.user.dto.TimelineItemDto>> getUserDailyTimeline(
            @PathVariable String nickname,
            @RequestParam String date) {
        return ApiResponse.success(userService.getDailyTimelineByNickname(nickname, date));
    }

    @GetMapping("/me/extension-status")
    public ApiResponse<ExtensionStatusResponse> getExtensionStatus(
            @AuthenticationPrincipal Long userId) {
        return ApiResponse.success(userService.getExtensionStatus(userId));
    }

    @GetMapping("/{nickname}/history")
    public ApiResponse<Page<SubmissionLogResponse>> getUserSubmissionsByNickname(
            @PathVariable String nickname,
            @PageableDefault(size = 20) Pageable pageable,
            @RequestParam(required = false) String date,
            @RequestParam(required = false) String tier,
            @RequestParam(required = false) String sourceType,
            @RequestParam(required = false) String status) {
        return ApiResponse
                .success(userService.getUserSubmissionsByNickname(nickname, pageable, date, tier, sourceType, status));
    }

    @GetMapping("/me/history")
    public ApiResponse<Page<SubmissionLogResponse>> getMySubmissions(
            @AuthenticationPrincipal Long userId,
            @PageableDefault(size = 20) Pageable pageable,
            @RequestParam(required = false) String date,
            @RequestParam(required = false) String tier,
            @RequestParam(required = false) String sourceType,
            @RequestParam(required = false) String status) {
        return ApiResponse.success(userService.getUserSubmissions(userId, pageable, date, tier, sourceType, status));
    }
}
