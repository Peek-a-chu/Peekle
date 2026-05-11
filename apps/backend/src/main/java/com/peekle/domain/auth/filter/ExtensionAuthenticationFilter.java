package com.peekle.domain.auth.filter;

import com.peekle.domain.user.service.UserService;
import com.peekle.domain.user.service.UserService.ExtensionTokenAuthentication;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class ExtensionAuthenticationFilter extends OncePerRequestFilter {

    private final UserService userService;
    private static final String EXTENSION_TOKEN_HEADER = "X-Peekle-Token";

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return "/api/problems/sync".equals(request.getRequestURI());
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) throws ServletException, IOException {
        String token = request.getHeader(EXTENSION_TOKEN_HEADER);

        if (token != null && !token.isEmpty()) {
            try {
                ExtensionTokenAuthentication principal = userService.getExtensionTokenAuthentication(token);

                if (principal != null) {
                    String authority = "ROLE_" + principal.roleName();
                    UsernamePasswordAuthenticationToken authentication =
                            new UsernamePasswordAuthenticationToken(
                                    principal.userId(),
                                    null,
                                    List.of(new SimpleGrantedAuthority(authority)));
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                    log.debug("Authenticated user {} via extension token", principal.userId());
                }
            } catch (Exception e) {
                log.warn("Failed to authenticate with extension token: {}", e.getMessage());
                // 인증 실패 시 SecurityContext 설정하지 않고 진행 -> 이후 인증 필요한 엔드포인트에서 401 발생
            }
        }

        filterChain.doFilter(request, response);
    }
}
