package com.peekle.global.auth.filter;

import com.peekle.domain.user.entity.User;
import com.peekle.domain.user.service.UserService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;

@Slf4j
@Component
@RequiredArgsConstructor
public class ExtensionAuthenticationFilter extends OncePerRequestFilter {

    private final UserService userService;
    private static final String EXTENSION_TOKEN_HEADER = "X-Peekle-Token";

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) throws ServletException, IOException {
        String token = request.getHeader(EXTENSION_TOKEN_HEADER);

        if (token != null && !token.isEmpty()) {
            try {
                // 토큰으로 유저 조회 (유효하지 않으면 예외 발생하며 catch 블록으로 이동 or null 리턴 상황 처리)
                // userService.getUserByExtensionToken(token) 은 INVALID_TOKEN 예외를 던짐
                User user = userService.getUserByExtensionToken(token);

                if (user != null) {
                    UsernamePasswordAuthenticationToken authentication =
                            new UsernamePasswordAuthenticationToken(user.getId(), null, Collections.emptyList());
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                    log.debug("Authenticated user {} via extension token", user.getNickname());
                }
            } catch (Exception e) {
                log.warn("Failed to authenticate with extension token: {}", e.getMessage());
                // 인증 실패 시 SecurityContext 설정하지 않고 진행 -> 이후 인증 필요한 엔드포인트에서 401 발생
            }
        }

        filterChain.doFilter(request, response);
    }
}
