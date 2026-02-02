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
    private final com.peekle.global.storage.R2StorageService r2StorageService;

    @Transactional
    public String generateExtensionToken(Long userId, boolean forceRegenerate) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        // Return existing token if already present (Single Token for Multiple Devices)
        // and NOT forcing regeneration
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
                .profileImg(user.getProfileImg())
                .profileImgThumb(user.getProfileImgThumb())
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
        java.util.List<com.peekle.domain.submission.entity.SubmissionLog> logs = submissionLogRepository
                .findAllByUserIdOrderBySubmittedAtAsc(userId);

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

        java.util.List<com.peekle.domain.submission.entity.SubmissionLog> logs = submissionLogRepository
                .findAllByUserIdAndSubmittedAtBetweenOrderBySubmittedAtDesc(
                        userId, startOfDay, endOfDay);

        java.util.List<TimelineItemDto> timeline = new java.util.ArrayList<>();
        java.util.Set<String> processedKeys = new java.util.HashSet<>();

        for (com.peekle.domain.submission.entity.SubmissionLog log : logs) {
            com.peekle.domain.problem.entity.Problem problem = log.getProblem();

            // String tagKey = log.getTag() != null ? log.getTag() : "null";
            // String uniqueKey = problem.getId() + ":" + tagKey;

            // if (!processedKeys.contains(uniqueKey)) {
            // processedKeys.add(uniqueKey);
            {

                // Use denormalized fields from SubmissionLog if available to avoid potential
                // N+1 or extra joins if not fetched
                // The entity definition shows problemTitle, problemTier, and now externalId
                // exist.
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
                        .result(log.getResult())
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

        List<com.peekle.domain.submission.entity.SubmissionLog> todayLogs = submissionLogRepository
                .findAllByUserIdAndSubmittedAtBetweenOrderBySubmittedAtDesc(
                        userId, startOfDay, endOfDay);

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
        Page<SubmissionLog> logs = submissionLogRepository.findAllByUserIdOrderBySubmittedAtDesc(userId, pageable);

        return logs.map(SubmissionLogResponse::from);
    }

    @Transactional
    public void updateUserProfile(Long userId, com.peekle.domain.user.dto.UserUpdateRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        // 닉네임 중복 검사 (새로운 닉네임이 입력되었고, 기존과 다를 경우)
        if (request.getNickname() != null && !request.getNickname().equals(user.getNickname())) {
            if (userRepository.findByNickname(request.getNickname()).isPresent()) {
                throw new BusinessException(ErrorCode.DUPLICATE_NICKNAME);
            }
        }

        // 백준 아이디 중복 검사 (새로운 아이디 입력시)
        if (request.getBojId() != null && !request.getBojId().equals(user.getBojId())) {
            if (userRepository.findByBojId(request.getBojId()).isPresent()) {
                throw new BusinessException(ErrorCode.DUPLICATE_BOJ_ID);
            }
        }

        // 프로필 이미지 삭제 요청 처리
        if (Boolean.TRUE.equals(request.getIsProfileImageDeleted())) {
            // 기존 이미지 삭제
            if (user.getProfileImg() != null) {
                r2StorageService.deleteFile(user.getProfileImg());
            }
            if (user.getProfileImgThumb() != null) {
                r2StorageService.deleteFile(user.getProfileImgThumb());
            }
            // DB 업데이트 (null 설정)
            user.deleteProfileImage();
        }
        // 새 이미지 업로드 처리 (삭제 요청이 아닐 때만)
        else {
            // 기존 프로필 이미지 삭제 (새 이미지가 들어왔고, 기존 이미지가 있다면)
            if (request.getProfileImg() != null && user.getProfileImg() != null
                    && !request.getProfileImg().equals(user.getProfileImg())) {
                r2StorageService.deleteFile(user.getProfileImg());
            }

            // 기존 썸네일 이미지 삭제
            if (request.getProfileImgThumb() != null && user.getProfileImgThumb() != null
                    && !request.getProfileImgThumb().equals(user.getProfileImgThumb())) {
                r2StorageService.deleteFile(user.getProfileImgThumb());
            }

            user.updateProfile(
                    request.getNickname(),
                    request.getBojId(),
                    request.getProfileImg(),
                    request.getProfileImgThumb());
        }

        // 닉네임/BOJ ID 등 다른 필드 업데이트는 위 else 블록 안의 updateProfile에서 처리되거나,
        // 별도로 처리해야 함. updateProfile 메소드가 모든 필드를 처리하므로,
        // 삭제 시에는 updateProfile을 호출할 때 이미지 필드를 null로 주거나,
        // deleteProfileImage() 호출 후 이미지를 제외한 필드만 updateProfile로 처리해야 함.

        // Refactoring to ensure nickname/bojId are updated regardless of image deletion
        // but image fields are respected.

        // Let's reset logic slightly to be cleaner.
        // If deleted, we effectively set new image to null for the update call, OR use
        // specific method.
        // user.deleteProfileImage() sets them to null.
        // user.updateProfile checks for nulls and DOES NOT update if null.
        // So if we call deleteProfileImage(), we shouldn't pass image fields to
        // updateProfile unless we want to overwrite them (which we shouldn't).

        if (!Boolean.TRUE.equals(request.getIsProfileImageDeleted())) {
            user.updateProfile(
                    request.getNickname(),
                    request.getBojId(),
                    request.getProfileImg(),
                    request.getProfileImgThumb());
        } else {
            user.updateProfile(
                    request.getNickname(),
                    request.getBojId(),
                    null,
                    null);
        }
    }

    public Map<String, String> getProfileImagePresignedUrl(Long userId, String fileName, String contentType) {
        // 파일명: profile/{userId}/{timestamp}_{fileName}
        String objectKey = "profile/" + userId + "/" + System.currentTimeMillis() + "_" + fileName;
        String presignedUrl = r2StorageService.generatePresignedUrl(objectKey, contentType);
        String publicUrl = r2StorageService.getPublicUrl(objectKey);

        Map<String, String> response = new HashMap<>();
        response.put("presignedUrl", presignedUrl);
        response.put("publicUrl", publicUrl);
        return response;
    }
}
