package com.peekle.domain.user.service;

import com.peekle.domain.submission.repository.SubmissionLogRepository;
import com.peekle.domain.user.dto.TimelineItemDto;
import com.peekle.domain.user.dto.UserProfileResponse;
import com.peekle.domain.user.entity.User;
import com.peekle.domain.user.repository.UserRepository;
import com.peekle.global.exception.BusinessException;
import com.peekle.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Page;
import com.peekle.domain.submission.dto.SubmissionLogResponse;
import com.peekle.domain.submission.entity.SubmissionLog;


import java.util.HashMap;
import java.util.List;
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
        return getUserProfile(user.getId(), null);
    }

    @Transactional(readOnly = true)
    public UserProfileResponse getUserProfileByNickname(String nickname, Long currentUserId) {
        User user = userRepository.findByNickname(nickname)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
        return getUserProfile(user.getId(), currentUserId);
    }

    @Transactional(readOnly = true)
    public UserProfileResponse getUserProfile(Long userId) {
        return getUserProfile(userId, null);
    }

    @Transactional(readOnly = true)
    public UserProfileResponse getUserProfile(Long userId, Long currentUserId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        // 2. 랭킹 계산 (동일 그룹 내 혹은 전체)
        long rank = userRepository.countByLeaguePointGreaterThan(user.getLeaguePoint()) + 1;

        // 3. 필드 데이터 조회
        long solvedCount = submissionLogRepository.countByUserId(user.getId());

        boolean isMe = currentUserId != null && currentUserId.equals(userId);

        // 4. DTO 반환
        return UserProfileResponse.builder()
                .id(user.getId())
                .nickname(user.getNickname())
                .bojId(user.getBojId())
                .leagueName(user.getLeague().name())
                .score((long) user.getLeaguePoint())
                .rank((int) rank)
                .profileImg(user.getProfileImgThumb())
                .streakCurrent(user.getStreakCurrent())
                .streakMax(user.getStreakMax())
                .solvedCount(solvedCount)
                .me(isMe)
                .build();
    }
    public User getUserByExtensionToken(String token) {
        return userRepository.findByExtensionToken(token)
                .orElseThrow(() -> new BusinessException(ErrorCode.INVALID_TOKEN));
    }

    public boolean existsByNickname(String nickname) {
        return userRepository.findByNickname(nickname).isPresent();
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

    @Transactional(readOnly = true)
    public java.util.List<com.peekle.domain.user.dto.ActivityStreakDto> getUserActivityStreak(Long userId) {
        // 1. 유저의 모든 제출 내역 조회 (오래된 순)
        java.util.List<com.peekle.domain.submission.entity.SubmissionLog> logs = 
                submissionLogRepository.findAllByUserIdOrderBySubmittedAtAsc(userId);

        Map<String, Long> dailyCounts = new HashMap<>();
        
        // 3. 일별 중복 제거를 위한 Set (하루에 같은 문제 여러 번 푼 경우 제외, 다른 날 풀면 포함)
        java.util.Set<String> dailySolvedCheck = new java.util.HashSet<>();
            
        // 4. 실제 데이터로 업데이트
        for (com.peekle.domain.submission.entity.SubmissionLog log : logs) {
            Long problemId = log.getProblem().getId();
            String date = log.getSubmittedAt().toLocalDate().toString(); // YYYY-MM-DD
            String uniqueKey = date + ":" + problemId;
            
            // 해당 날짜에 아직 안 푼 문제인 경우에만 카운트
            if (!dailySolvedCheck.contains(uniqueKey)) {
                dailySolvedCheck.add(uniqueKey);
                dailyCounts.put(date, dailyCounts.getOrDefault(date, 0L) + 1);
            }
        }

        // 5. DTO 변환 (날짜순 정렬)
        return dailyCounts.entrySet().stream()
                .map(entry -> new com.peekle.domain.user.dto.ActivityStreakDto(entry.getKey(), entry.getValue()))
                .sorted(java.util.Comparator.comparing(com.peekle.domain.user.dto.ActivityStreakDto::getDate))
                .collect(java.util.stream.Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<TimelineItemDto> getDailyTimeline(Long userId, String dateStr) {
        java.time.LocalDate date = java.time.LocalDate.parse(dateStr);
        java.time.LocalDateTime startOfDay = date.atStartOfDay();
        java.time.LocalDateTime endOfDay = date.plusDays(1).atStartOfDay();

        java.util.List<com.peekle.domain.submission.entity.SubmissionLog> logs = 
                submissionLogRepository.findAllByUserIdAndSubmittedAtBetweenOrderBySubmittedAtDesc(
                        userId, startOfDay, endOfDay
                );

        java.util.List<TimelineItemDto> timeline = new java.util.ArrayList<>();
        java.util.Set<String> processedKeys = new java.util.HashSet<>();

        for (com.peekle.domain.submission.entity.SubmissionLog log : logs) {
            com.peekle.domain.problem.entity.Problem problem = log.getProblem();
            
            // String tagKey = log.getTag() != null ? log.getTag() : "null";
            // String uniqueKey = problem.getId() + ":" + tagKey;
            
            // if (!processedKeys.contains(uniqueKey)) {
            //     processedKeys.add(uniqueKey);
            {
                
                // Use denormalized fields from SubmissionLog if available to avoid potential N+1 or extra joins if not fetched
                // The entity definition shows problemTitle, problemTier, and now externalId exist.
                String tierStr = log.getProblemTier() != null ? log.getProblemTier().toLowerCase() : "unknown";
                String title = log.getProblemTitle() != null ? log.getProblemTitle() : problem.getTitle();
                String problemIdStr = log.getExternalId() != null ? log.getExternalId() : problem.getExternalId();
                // construct URL manually since it's standard BOJ URL pattern
                String problemLink = "https://www.acmicpc.net/problem/" + problemIdStr;

                String tierName = "unknown";
                int tierLevel = 0;
                
                String[] parts = tierStr.split(" ");
                if (parts.length >= 2) {
                    tierName = parts[0];
                    try {
                        tierLevel = Integer.parseInt(parts[1]);
                    } catch (NumberFormatException e) {
                        tierLevel = 0;
                    }
                } else {
                    tierName = tierStr;
                }
                
                timeline.add(TimelineItemDto.builder()
                        .submissionId(log.getId())
                        .problemId(problemIdStr) 
                        .title(title)
                        .tier(tierName) 
                        .tierLevel(tierLevel) 
                        .link(problemLink)
                        .tag(log.getTag()) // Map tag from log
                        .sourceType(log.getSourceType() != null ? log.getSourceType().name() : "EXTENSION")
                        .language(log.getLanguage())
                        .memory(log.getMemory())
                        .executionTime(log.getExecutionTime())
                        .submittedAt(log.getSubmittedAt().toString())
                        .build());
            }
        }
        
        return timeline;
    }
    @Transactional(readOnly = true)
    public com.peekle.domain.user.dto.ExtensionStatusResponse getExtensionStatus(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        // Check if solved today
        java.time.LocalDateTime startOfDay = java.time.LocalDate.now().atStartOfDay();
        java.time.LocalDateTime endOfDay = java.time.LocalDate.now().plusDays(1).atStartOfDay();
        
        List<com.peekle.domain.submission.entity.SubmissionLog> todayLogs = 
                submissionLogRepository.findAllByUserIdAndSubmittedAtBetweenOrderBySubmittedAtDesc(
                        userId, startOfDay, endOfDay
                );
        
        boolean isSolvedToday = !todayLogs.isEmpty();

        return com.peekle.domain.user.dto.ExtensionStatusResponse.builder()
                .streakCurrent(user.getStreakCurrent())
                .isSolvedToday(isSolvedToday)
                .build();
    }

    @Transactional(readOnly = true)
    public Page<SubmissionLogResponse> getUserSubmissionsByNickname(String nickname, Pageable pageable) {
        User user = userRepository.findByNickname(nickname)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
        
        return getUserSubmissions(user.getId(), pageable);
    }

    @Transactional(readOnly = true)
    public Page<SubmissionLogResponse> getUserSubmissions(Long userId, Pageable pageable) {
        Page<SubmissionLog> logs = 
                submissionLogRepository.findAllByUserIdOrderBySubmittedAtDesc(userId, pageable);
        
        return logs.map(SubmissionLogResponse::from);
    }
}
