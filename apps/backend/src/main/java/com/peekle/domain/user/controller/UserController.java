package com.peekle.domain.user.controller;

import com.peekle.domain.user.dto.TokenValidationResponse;
import com.peekle.domain.user.dto.UserProfileResponse;
import com.peekle.domain.user.service.UserService;
import com.peekle.global.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

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
        if (userId == null) {
            throw new com.peekle.global.exception.BusinessException(com.peekle.global.exception.ErrorCode.UNAUTHORIZED);
        }
        Map<String, Object> userInfo = userService.getUserInfo(userId);
        return ApiResponse.success(userInfo);
    }

    @PostMapping("/me/extension-token")
    public ApiResponse<Map<String, String>> generateExtensionToken(
            @AuthenticationPrincipal Long userId,
            @RequestParam(defaultValue = "false") boolean regenerate) {
        if (userId == null) {
            throw new com.peekle.global.exception.BusinessException(com.peekle.global.exception.ErrorCode.UNAUTHORIZED);
        }
        String token = userService.generateExtensionToken(userId, regenerate);
        Map<String, String> response = new HashMap<>();
        response.put("extensionToken", token);
        return ApiResponse.success(response);
    }

    @GetMapping("/me/profile")
    public ApiResponse<UserProfileResponse> getUserProfile(
            @AuthenticationPrincipal Long userId,
            @RequestHeader(value = "X-Peekle-Token", required = false) String token) {
        if (userId == null) {
            throw new com.peekle.global.exception.BusinessException(com.peekle.global.exception.ErrorCode.UNAUTHORIZED);
        }
        UserProfileResponse response = userService.getUserProfile(userId, userId);
        return ApiResponse.success(response);
    }

    @GetMapping("/{nickname}/profile")
    public ApiResponse<UserProfileResponse> getUserProfileByNickname(
            @PathVariable String nickname,
            @AuthenticationPrincipal Long currentUserId) {
        UserProfileResponse response = userService.getUserProfileByNickname(nickname, currentUserId);
        return ApiResponse.success(response);
    }

    @GetMapping("/me/validate-token")
    public ApiResponse<TokenValidationResponse> validateToken(
            @AuthenticationPrincipal Long userId,
            @RequestHeader("X-Peekle-Token") String token) {
        if (userId == null) {
            throw new com.peekle.global.exception.BusinessException(com.peekle.global.exception.ErrorCode.UNAUTHORIZED);
        }
        boolean isValidUserToken = userService.validateExtensionToken(userId, token);
        return ApiResponse.success(new TokenValidationResponse(isValidUserToken));
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
}
