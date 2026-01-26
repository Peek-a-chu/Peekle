package com.peekle.domain.user.service;

import com.peekle.domain.submission.repository.SubmissionLogRepository;
import com.peekle.domain.user.dto.UserProfileResponse;
import com.peekle.domain.user.entity.User;
import com.peekle.domain.user.repository.UserRepository;
import com.peekle.global.exception.BusinessException;
import com.peekle.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserService {
    private final UserRepository userRepository;
    private final SubmissionLogRepository submissionLogRepository;

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
        User user = userRepository.findByExtensionToken(token)
                .orElseThrow(() -> new BusinessException(ErrorCode.INVALID_TOKEN));
        return getUserProfile(user.getId());
    }

    @Transactional(readOnly = true)
    public UserProfileResponse getUserProfile(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        // 2. 랭킹 계산 (동일 그룹 내 혹은 전체)
        long rank = userRepository.countByLeaguePointGreaterThan(user.getLeaguePoint()) + 1;

        // 3. 필드 데이터 조회
        long solvedCount = submissionLogRepository.countByUserId(user.getId());

        // 4. DTO 반환
        return UserProfileResponse.builder()
                .id(user.getId())
                .nickname(user.getNickname())
                .bojId(user.getBojId())
                .leagueName(user.getLeague().name())
                .score((long) user.getLeaguePoint())
                .rank((int) rank)
                .profileImage(user.getProfileImgThumb())
                .streakCurrent(user.getStreakCurrent())
                .streakMax(user.getStreakMax())
                .solvedCount(solvedCount)
                .build();
    }
    public User getUserByExtensionToken(String token) {
        return userRepository.findByExtensionToken(token)
                .orElseThrow(() -> new BusinessException(ErrorCode.INVALID_TOKEN));
    }

    public Map<String, Object> getUserInfo(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        Map<String, Object> info = new HashMap<>();
        info.put("id", user.getId());
        info.put("nickname", user.getNickname());
        info.put("profileImg", user.getProfileImg());
        info.put("bojId", user.getBojId());
        info.put("league", user.getLeague().name());
        info.put("leaguePoint", user.getLeaguePoint());
        return info;
    }
}
