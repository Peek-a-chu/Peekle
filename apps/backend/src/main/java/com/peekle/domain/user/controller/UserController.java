package com.peekle.domain.user.controller;

import com.peekle.domain.user.dto.TokenValidationResponse;
import com.peekle.domain.user.dto.UserProfileResponse;
import com.peekle.domain.user.service.UserService;
import com.peekle.global.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/users")
public class UserController {
    private final UserService userService;

    @PostMapping("/me/extension-token")
    public ApiResponse<Map<String, String>> generateExtensionToken(@RequestParam(defaultValue = "false") boolean regenerate) {
        // TODO: Get actual logged-in user ID from SecurityContext
        Long currentUserId = 1L;
        String token = userService.generateExtensionToken(currentUserId, regenerate);
        Map<String, String> response = new HashMap<>();
        response.put("extensionToken", token);
        return ApiResponse.success(response);
    }

    @GetMapping("/me/profile")
    public ApiResponse<UserProfileResponse> getUserProfile(@RequestHeader(value = "X-Peekle-Token", required = false) String token) {
        // TODO: Get actual logged-in user ID from SecurityContext
        // me일 때 임시로 userid가 1인 걸로 하자
        Long currentUserId = 1L;
        UserProfileResponse response = userService.getUserProfile(currentUserId);
        return ApiResponse.success(response);
    }

    @GetMapping("/me/validate-token")
    public ApiResponse<TokenValidationResponse> validateToken(@RequestHeader("X-Peekle-Token") String token) {
        // TODO: Get actual logged-in user ID from SecurityContext
        Long currentUserId = 1L;
        boolean isValidUserToken = userService.validateExtensionToken(currentUserId, token);
        return ApiResponse.success(new TokenValidationResponse(isValidUserToken));
    }
}
