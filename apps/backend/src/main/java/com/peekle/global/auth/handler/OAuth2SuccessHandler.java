package com.peekle.global.auth.handler;

import com.peekle.domain.user.entity.User;
import com.peekle.domain.user.repository.UserRepository;
import com.peekle.global.auth.jwt.JwtTokenProvider;
import com.peekle.global.auth.service.RefreshTokenService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.Optional;

@Component
public class OAuth2SuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final JwtTokenProvider jwtTokenProvider;
    private final UserRepository userRepository;
    private final RefreshTokenService refreshTokenService;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    public OAuth2SuccessHandler(JwtTokenProvider jwtTokenProvider,
            UserRepository userRepository,
            RefreshTokenService refreshTokenService) {
        this.jwtTokenProvider = jwtTokenProvider;
        this.userRepository = userRepository;
        this.refreshTokenService = refreshTokenService;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request,
            HttpServletResponse response,
            Authentication authentication) throws IOException {
        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();

        String socialId = (String) oAuth2User.getAttributes().get("socialId");
        String provider = (String) oAuth2User.getAttributes().get("provider");
        String nickname = (String) oAuth2User.getAttributes().get("oauth2Nickname");
        String profileImage = (String) oAuth2User.getAttributes().get("oauth2ProfileImage");

        Optional<User> existingUser = userRepository.findBySocialIdAndProvider(socialId, provider);

        if (existingUser.isPresent()) {
            User user = existingUser.get();
            String accessToken = jwtTokenProvider.createAccessToken(user.getId());
            String refreshToken = jwtTokenProvider.createRefreshToken(user.getId());

            refreshTokenService.save(user.getId(), refreshToken, jwtTokenProvider.getRefreshTokenExpiry());

            addCookie(response, "access_token", accessToken, (int) (jwtTokenProvider.getAccessTokenExpiry() / 1000));
            addCookie(response, "refresh_token", refreshToken, (int) (jwtTokenProvider.getRefreshTokenExpiry() / 1000));

            response.sendRedirect(frontendUrl + "/home");
        } else {
            String tempToken = jwtTokenProvider.createTempSignupToken(socialId, provider, nickname, profileImage);
            response.sendRedirect(frontendUrl + "/signup?token=" + tempToken);
        }
    }

    private void addCookie(HttpServletResponse response, String name, String value, int maxAge) {
        Cookie cookie = new Cookie(name, value);
        cookie.setHttpOnly(true);
        cookie.setSecure(true);
        cookie.setPath("/");
        cookie.setMaxAge(maxAge);
        response.addCookie(cookie);
    }
}
