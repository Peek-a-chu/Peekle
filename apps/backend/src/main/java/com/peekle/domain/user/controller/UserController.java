package com.peekle.domain.user.controller;

import com.peekle.domain.submission.dto.SubmissionLogResponse;
import com.peekle.domain.user.dto.ExtensionStatusResponse;
import com.peekle.domain.user.dto.TokenValidationRequest;
import com.peekle.domain.user.dto.TokenValidationResponse;
import com.peekle.domain.user.dto.UserProfileResponse;
import com.peekle.domain.user.dto.UserUpdateRequest;
import com.peekle.domain.user.service.UserService;
import com.peekle.global.dto.ApiResponse;
import com.peekle.global.exception.BusinessException;
import com.peekle.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

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
        requireAuthenticatedUserId(userId);
        Map<String, Object> userInfo = userService.getUserInfo(userId);
        return ApiResponse.success(userInfo);
    }

    @PostMapping("/me/extension-token")
    public ApiResponse<Map<String, String>> generateExtensionToken(
            @AuthenticationPrincipal Long userId,
            @RequestParam(defaultValue = "false") boolean regenerate) {
        requireAuthenticatedUserId(userId);
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
        requireAuthenticatedUserId(userId);
        UserProfileResponse response = userService.getUserProfile(userId, userId);
        return ApiResponse.success(response);
    }

    @PatchMapping("/me")
    public ApiResponse<Void> updateProfile(
            @AuthenticationPrincipal Long userId,
            @RequestBody UserUpdateRequest request) {
        requireAuthenticatedUserId(userId);
        userService.updateUserProfile(userId, request);
        return ApiResponse.success(null);
    }

    @PostMapping("/me/profile-image/presigned-url")
    public ApiResponse<Map<String, String>> getProfileImagePresignedUrl(
            @AuthenticationPrincipal Long userId,
            @RequestBody Map<String, String> request) {
        requireAuthenticatedUserId(userId);
        String fileName = request.get("fileName");
        String contentType = request.get("contentType");

        Map<String, String> urls = userService.getProfileImagePresignedUrl(userId, fileName, contentType);
        return ApiResponse.success(urls);
    }

    @PostMapping("/me/validate-token")
    public ApiResponse<TokenValidationResponse> validateToken(
            @AuthenticationPrincipal Long userId,
            @RequestBody TokenValidationRequest request) {
        requireAuthenticatedUserId(userId);
        boolean isValidUserToken = userService.validateExtensionToken(userId, request.token(), request.bojId());
        return ApiResponse.success(new TokenValidationResponse(isValidUserToken));
    }

    @GetMapping("/me/streak")
    public ApiResponse<java.util.List<com.peekle.domain.user.dto.ActivityStreakDto>> getActivityStreak(
            @AuthenticationPrincipal Long userId) {
        requireAuthenticatedUserId(userId);
        return ApiResponse.success(userService.getUserActivityStreak(userId));
    }

    @GetMapping("/{nickname}/streak")
    public ApiResponse<java.util.List<com.peekle.domain.user.dto.ActivityStreakDto>> getUserActivityStreak(
            @PathVariable String nickname) {
        return ApiResponse.success(userService.getUserActivityStreakByNickname(nickname));
    }

    @GetMapping("/check-nickname")
    public ApiResponse<Map<String, Object>> checkNickname(@RequestParam String nickname) {
        Pattern pattern = Pattern.compile("^[\\uAC00-\\uD7A3a-zA-Z0-9]{2,12}$");
        if (!pattern.matcher(nickname).matches()) {
            return ApiResponse.success(Map.of(
                    "available", false,
                    "message", "\uB2C9\uB124\uC784\uC740 2~12\uC790, \uD55C\uAE00/\uC601\uBB38/\uC22B\uC790\uB9CC \uC0AC\uC6A9\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4."));
        }

        boolean exists = userService.existsByNickname(nickname);
        if (exists) {
            return ApiResponse.success(Map.of(
                    "available", false,
                    "message", "\uC774\uBBF8 \uC0AC\uC6A9\uC911\uC778 \uB2C9\uB124\uC784\uC785\uB2C8\uB2E4."));
        }

        return ApiResponse.success(Map.of(
                "available", true,
                "message", "\uC0AC\uC6A9 \uAC00\uB2A5\uD55C \uB2C9\uB124\uC784\uC785\uB2C8\uB2E4."));
    }

    @GetMapping("/check-boj-id")
    public ApiResponse<Map<String, Object>> checkBojId(@RequestParam String bojId) {
        if (bojId == null || bojId.trim().isEmpty()) {
            return ApiResponse.success(Map.of(
                    "valid", false,
                    "message", "\uBC31\uC900 \uC544\uC774\uB514\uB97C \uC785\uB825\uD574\uC8FC\uC138\uC694."));
        }

        boolean isValid = userService.validateBojId(bojId);

        if (isValid) {
            return ApiResponse.success(Map.of(
                    "valid", true,
                    "message", "\uD655\uC778\uB418\uC5C8\uC2B5\uB2C8\uB2E4."));
        } else {
            return ApiResponse.success(Map.of(
                    "valid", false,
                    "message", "\uC874\uC7AC\uD558\uC9C0 \uC54A\uB294 \uBC31\uC900 \uC544\uC774\uB514\uC785\uB2C8\uB2E4."));
        }
    }

    @GetMapping("/me/timeline")
    public ApiResponse<java.util.List<com.peekle.domain.user.dto.TimelineItemDto>> getDailyTimeline(
            @AuthenticationPrincipal Long userId,
            @RequestParam String date) {
        requireAuthenticatedUserId(userId);
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
        requireAuthenticatedUserId(userId);
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
        requireAuthenticatedUserId(userId);
        return ApiResponse.success(userService.getUserSubmissions(userId, pageable, date, tier, sourceType, status));
    }

    private void requireAuthenticatedUserId(Long userId) {
        if (userId == null) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }
    }
}
