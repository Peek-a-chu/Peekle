package com.peekle.domain.user.service;

import com.peekle.domain.user.dto.UserProfileResponse;
import com.peekle.domain.user.entity.User;
import com.peekle.domain.user.repository.UserRepository;
import com.peekle.global.exception.BusinessException;
import com.peekle.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserService {
    private final UserRepository userRepository;

    @Transactional
    public String generateExtensionToken(Long userId, boolean forceRegenerate) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        // Return existing token if already present (Single Token for Multiple Devices) and NOT forcing regeneration
        if (!forceRegenerate && user.getExtensionToken() != null && !user.getExtensionToken().isEmpty()) {
            return user.getExtensionToken();
        }

        // Generate new UUID token
        String token = UUID.randomUUID().toString();
        
        user.updateExtensionToken(token);
        
        return token;
    }

    public boolean validateExtensionToken(Long userId, String token) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
        
        if (user.getExtensionToken() == null) {
            return false;
        }
        
        return user.getExtensionToken().equals(token);
    }

    @Transactional(readOnly = true)
    public UserProfileResponse getUserProfileByToken(String token) {
        // 1. 토큰으로 사용자 조회 (실패 시 BusinessException 발생)
        User user = userRepository.findByExtensionToken(token)
                .orElseThrow(() -> new BusinessException(ErrorCode.INVALID_TOKEN));

        // 2. 랭킹 계산 (동일 그룹 내 혹은 전체)
        // 여기서는 예시로 전체 랭킹을 계산합니다.
        long rank = userRepository.countByLeaguePointGreaterThan(user.getLeaguePoint()) + 1;

        // 3. DTO 반환 (Enum인 LeagueTier는 .name()으로 전달)
        return UserProfileResponse.builder()
                .nickname(user.getNickname())
                .leagueName(user.getLeague().name())
                .score((long) user.getLeaguePoint())
                .rank((int) rank)
                .profileImage(user.getProfileImgThumb())
                .build();
    }
    public User getUserByExtensionToken(String token) {
        return userRepository.findByExtensionToken(token)
                .orElseThrow(() -> new BusinessException(ErrorCode.INVALID_TOKEN));
    }
}
