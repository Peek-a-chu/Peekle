package com.peekle.domain.auth.controller;

import com.peekle.domain.user.entity.User;
import com.peekle.domain.user.repository.UserRepository;
import com.peekle.domain.auth.dto.SignupRequest;
import com.peekle.domain.auth.jwt.JwtTokenProvider;
import com.peekle.domain.auth.service.RefreshTokenService;
import com.peekle.global.dto.ApiResponse;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/auth")
public class AuthController {

    private final JwtTokenProvider jwtTokenProvider;
    private final RefreshTokenService refreshTokenService;
    private final UserRepository userRepository;
    private final com.peekle.domain.league.service.LeagueService leagueService;

    @PostMapping("/refresh")
    public ApiResponse<Void> refresh(HttpServletRequest request, HttpServletResponse response) {
        String refreshToken = extractCookie(request, "refresh_token");

        if (refreshToken == null || !jwtTokenProvider.validateToken(refreshToken)) {
            clearAuthCookies(response);
            return ApiResponse.error("INVALID_REFRESH_TOKEN", "Refresh token is invalid or expired");
        }

        if (!"refresh".equals(jwtTokenProvider.getTokenType(refreshToken))) {
            clearAuthCookies(response);
            return ApiResponse.error("INVALID_TOKEN_TYPE", "Not a refresh token");
        }

        Long userId = jwtTokenProvider.getUserIdFromToken(refreshToken);
        String storedToken = refreshTokenService.get(userId);

        if (storedToken == null || !storedToken.equals(refreshToken)) {
            clearAuthCookies(response);
            return ApiResponse.error("TOKEN_MISMATCH", "Refresh token does not match stored token");
        }

        String newAccessToken = jwtTokenProvider.createAccessToken(userId);
        String newRefreshToken = jwtTokenProvider.createRefreshToken(userId);

        refreshTokenService.save(userId, newRefreshToken, jwtTokenProvider.getRefreshTokenExpiry());

        addCookie(response, "access_token", newAccessToken, (int) (jwtTokenProvider.getAccessTokenExpiry() / 1000));
        addCookie(response, "refresh_token", newRefreshToken, (int) (jwtTokenProvider.getRefreshTokenExpiry() / 1000));

        return ApiResponse.success(null);
    }

    @PostMapping("/logout")
    public ApiResponse<Void> logout(HttpServletRequest request, HttpServletResponse response) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof Long userId) {
            refreshTokenService.delete(userId);
        }

        clearAuthCookies(response);
        SecurityContextHolder.clearContext();

        return ApiResponse.success(null);
    }

    @PostMapping("/signup")
    public ApiResponse<Void> signup(@Valid @RequestBody SignupRequest signupRequest, HttpServletResponse response) {
        String token = signupRequest.token();

        if (!jwtTokenProvider.validateToken(token) || !"signup".equals(jwtTokenProvider.getTokenType(token))) {
            return ApiResponse.error("INVALID_SIGNUP_TOKEN", "Signup token is invalid or expired");
        }

        Map<String, Object> signupInfo = jwtTokenProvider.getSignupInfoFromToken(token);
        String socialId = (String) signupInfo.get("socialId");
        String provider = (String) signupInfo.get("provider");

        if (userRepository.findBySocialIdAndProvider(socialId, provider).isPresent()) {
            return ApiResponse.error("USER_ALREADY_EXISTS", "User already registered");
        }

        if (userRepository.findByNickname(signupRequest.nickname()).isPresent()) {
            return ApiResponse.error("NICKNAME_DUPLICATE", "Nickname already in use");
        }

        User user = new User(socialId, provider, signupRequest.nickname());
        if (signupRequest.bojId() != null && !signupRequest.bojId().isBlank()) {
            user.registerBojId(signupRequest.bojId());
        }
        userRepository.save(user); // 저장 후
        leagueService.assignInitialLeague(user); // 리그 배정 (트랜잭션 분리되어도 됨, 혹은 여기서 호출)

        String accessToken = jwtTokenProvider.createAccessToken(user.getId());
        String refreshToken = jwtTokenProvider.createRefreshToken(user.getId());
        refreshTokenService.save(user.getId(), refreshToken, jwtTokenProvider.getRefreshTokenExpiry());

        addCookie(response, "access_token", accessToken, (int) (jwtTokenProvider.getAccessTokenExpiry() / 1000));
        addCookie(response, "refresh_token", refreshToken, (int) (jwtTokenProvider.getRefreshTokenExpiry() / 1000));

        return ApiResponse.success(null);
    }

    private String extractCookie(HttpServletRequest request, String name) {
        if (request.getCookies() == null) return null;
        for (Cookie cookie : request.getCookies()) {
            if (name.equals(cookie.getName())) {
                return cookie.getValue();
            }
        }
        return null;
    }

    private void addCookie(HttpServletResponse response, String name, String value, int maxAge) {
        Cookie cookie = new Cookie(name, value);
        cookie.setHttpOnly(true);
        cookie.setSecure(false);
        cookie.setPath("/");
        cookie.setMaxAge(maxAge);
        response.addCookie(cookie);
    }

    private void clearAuthCookies(HttpServletResponse response) {
        Cookie accessCookie = new Cookie("access_token", "");
        accessCookie.setHttpOnly(true);
        accessCookie.setPath("/");
        accessCookie.setMaxAge(0);
        response.addCookie(accessCookie);

        Cookie refreshCookie = new Cookie("refresh_token", "");
        refreshCookie.setHttpOnly(true);
        refreshCookie.setPath("/");
        refreshCookie.setMaxAge(0);
        response.addCookie(refreshCookie);
    }
}
