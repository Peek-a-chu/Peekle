package com.peekle.domain.study.service;

import com.peekle.domain.study.dto.ide.IdeRequest;
import com.peekle.domain.study.dto.ide.IdeResponse;
import com.peekle.domain.user.entity.User;
import com.peekle.domain.user.repository.UserRepository;
import com.peekle.global.exception.BusinessException;
import com.peekle.global.exception.ErrorCode;
import com.peekle.global.redis.RedisKeyConst;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RedisIdeService {

    private final RedisTemplate<String, Object> redisTemplate;
    private final UserRepository userRepository;
    private final StudyMemberProgressService studyMemberProgressService;

    /**
     * Save IDE code to Redis hash.
     */
    public void saveCode(Long studyId, Long userId, IdeRequest request) {
        Long problemId = (request.getProblemId() != null) ? request.getProblemId() : 0L;
        String language = (request.getLang() != null && !request.getLang().isBlank())
                ? request.getLang()
                : request.getLanguage();
        Long eventTs = request.getEventTs() != null ? request.getEventTs() : System.currentTimeMillis();
        saveCode(
                studyId,
                userId,
                problemId,
                request.getProblemTitle(),
                request.getExternalId(),
                request.getFilename(),
                request.getCode(),
                language,
                eventTs);
    }

    public void saveCode(
            Long studyId,
            Long userId,
            Long problemId,
            String problemTitle,
            String externalId,
            String filename,
            String code,
            String language,
            Long eventTs) {
        Long resolvedProblemId = (problemId != null) ? problemId : 0L;
        String key = String.format(RedisKeyConst.IDE_KEY, studyId, resolvedProblemId, userId);
        String normalizedLanguage = normalizeLanguage(language);
        String resolvedFilename = (filename != null && !filename.isBlank())
                ? filename
                : getDefaultFilename(normalizedLanguage);
        String resolvedCode = (code != null) ? code : "";
        Long resolvedEventTs = (eventTs != null) ? eventTs : System.currentTimeMillis();

        Map<String, String> data = new HashMap<>();
        data.put("problemId", resolvedProblemId.toString());
        if (problemTitle != null && !problemTitle.isBlank()) {
            data.put("problemTitle", problemTitle.trim());
        }
        String normalizedExternalId = (externalId != null && !externalId.isBlank()) ? externalId.trim() : null;
        if (normalizedExternalId != null) {
            data.put("externalId", normalizedExternalId);
        }
        data.put("filename", resolvedFilename);
        data.put("code", resolvedCode);
        data.put("lang", normalizedLanguage);
        data.put("eventTs", resolvedEventTs.toString());
        data.put("updatedAt", LocalDateTime.now().toString());

        redisTemplate.opsForHash().putAll(key, data);
        if (normalizedExternalId == null) {
            redisTemplate.opsForHash().delete(key, "externalId");
        }

        if (resolvedProblemId > 0) {
            saveActiveProblem(
                    studyId,
                    userId,
                    resolvedProblemId,
                    problemTitle,
                    normalizedExternalId,
                    resolvedFilename,
                    resolvedCode,
                    normalizedLanguage,
                    resolvedEventTs);
        }
    }

    public String getTemplateCode(String language) {
        String normalized = normalizeLanguage(language);
        if ("java".equals(normalized)) {
            return """
                    import java.io.*;
                    import java.util.*;

                    public class Main {
                        public static void main(String[] args) throws IOException {
                            BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
                            // 코드를 작성해주세요
                            System.out.println("Hello World!");
                        }
                    }""";
        }
        if ("cpp".equals(normalized)) {
            return """
                    #include <iostream>
                    #include <vector>
                    #include <algorithm>

                    using namespace std;

                    int main() {
                        // 코드를 작성해주세요
                        cout << "Hello World!" << endl;
                        return 0;
                    }""";
        }
        return """
                import sys

                # 코드를 작성해주세요
                print("Hello World!")""";
    }

    public String getDefaultFilename(String language) {
        String normalized = normalizeLanguage(language);
        return switch (normalized) {
            case "java" -> "Main.java";
            case "cpp" -> "main.cpp";
            default -> "main.py";
        };
    }

    public String normalizeLanguage(String language) {
        if (language == null || language.isBlank()) {
            return "python";
        }
        String normalized = language.trim().toLowerCase();
        if (normalized.contains("java") && !normalized.contains("script")) {
            return "java";
        }
        if (normalized.contains("cpp") || normalized.contains("c++")) {
            return "cpp";
        }
        return "python";
    }

    /**
     * Load IDE code for a user and problem.
     */
    public IdeResponse getCode(Long studyId, Long problemId, Long userId) {
        String key = String.format(RedisKeyConst.IDE_KEY, studyId, problemId, userId);
        Map<Object, Object> entries = redisTemplate.opsForHash().entries(key);

        if (entries.isEmpty()) {
            return null;
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        return IdeResponse.builder()
                .senderId(userId)
                .senderName(user.getNickname())
                .problemId(problemId)
                .problemTitle((String) entries.getOrDefault("problemTitle", null))
                .externalId((String) entries.getOrDefault("externalId", null))
                .filename((String) entries.getOrDefault("filename", "Untitled"))
                .code((String) entries.getOrDefault("code", ""))
                .lang((String) entries.getOrDefault("lang", "text"))
                .eventTs(parseEventTs(entries.get("eventTs")))
                .build();
    }

    private Long parseEventTs(Object rawEventTs) {
        if (rawEventTs == null) {
            return null;
        }
        try {
            return Long.valueOf(rawEventTs.toString());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    /**
     * Add a watcher for a target user's IDE.
     */
    public void addWatcher(Long studyId, Long targetUserId, Long viewerId) {
        String key = String.format(RedisKeyConst.IDE_WATCHERS, studyId, targetUserId);
        redisTemplate.opsForSet().add(key, viewerId.toString());

        String viewerKey = "user:" + viewerId + ":watching:" + studyId;
        redisTemplate.opsForSet().add(viewerKey, targetUserId.toString());
    }

    /**
     * Remove a watcher from a target user's IDE.
     */
    public void removeWatcher(Long studyId, Long targetUserId, Long viewerId) {
        String key = String.format(RedisKeyConst.IDE_WATCHERS, studyId, targetUserId);
        redisTemplate.opsForSet().remove(key, viewerId.toString());

        String viewerKey = "user:" + viewerId + ":watching:" + studyId;
        redisTemplate.opsForSet().remove(viewerKey, targetUserId.toString());
    }

    /**
     * Get all watcher IDs for target user.
     */
    public Set<String> getWatchers(Long studyId, Long targetUserId) {
        String key = String.format(RedisKeyConst.IDE_WATCHERS, studyId, targetUserId);
        Set<Object> members = redisTemplate.opsForSet().members(key);

        if (members == null || members.isEmpty()) {
            return Collections.emptySet();
        }

        return members.stream().map(Object::toString).collect(Collectors.toSet());
    }

    /**
     * Get all targets currently watched by viewer.
     */
    public Set<String> getWatchingTargets(Long studyId, Long viewerId) {
        String viewerKey = "user:" + viewerId + ":watching:" + studyId;
        Set<Object> targets = redisTemplate.opsForSet().members(viewerKey);
        if (targets == null) {
            return Collections.emptySet();
        }

        return targets.stream().map(Object::toString).collect(Collectors.toSet());
    }

    /**
     * Save which study problem this user is currently solving.
     */
    public void saveActiveProblem(Long studyId, Long userId, Long studyProblemId, String problemTitle) {
        saveActiveProblem(studyId, userId, studyProblemId, problemTitle, null, null, null, null, null);
    }

    public void saveActiveProblem(
            Long studyId,
            Long userId,
            Long studyProblemId,
            String problemTitle,
            String externalId,
            String filename,
            String code,
            String language,
            Long eventTs) {
        if (studyProblemId == null || studyProblemId <= 0) {
            return;
        }

        String key = String.format(RedisKeyConst.STUDY_USER_ACTIVE_PROBLEM, studyId, userId);
        String activeIdeKey = String.format(RedisKeyConst.STUDY_USER_ACTIVE_IDE, studyId, userId);
        String normalizedTitle = (problemTitle != null && !problemTitle.isBlank()) ? problemTitle.trim() : null;
        String normalizedExternalId = (externalId != null && !externalId.isBlank()) ? externalId.trim() : null;

        if (normalizedTitle == null) {
            Object existingTitle = redisTemplate.opsForHash().get(key, "problemTitle");
            if (existingTitle != null) {
                normalizedTitle = existingTitle.toString();
            }
        }

        String normalizedLanguage = normalizeLanguage(language);
        Object existingLang = redisTemplate.opsForHash().get(activeIdeKey, "lang");
        if ((language == null || language.isBlank()) && existingLang != null) {
            normalizedLanguage = normalizeLanguage(existingLang.toString());
        }
        String resolvedFilename = (filename != null && !filename.isBlank())
                ? filename
                : (redisTemplate.opsForHash().get(activeIdeKey, "filename") != null
                        ? redisTemplate.opsForHash().get(activeIdeKey, "filename").toString()
                        : getDefaultFilename(normalizedLanguage));
        String resolvedCode;
        if (code != null) {
            resolvedCode = code;
        } else {
            Object existingCode = redisTemplate.opsForHash().get(activeIdeKey, "code");
            resolvedCode = existingCode != null ? existingCode.toString() : "";
        }
        Long resolvedEventTs = eventTs != null
                ? eventTs
                : parseEventTs(redisTemplate.opsForHash().get(activeIdeKey, "eventTs"));
        if (resolvedEventTs == null) {
            resolvedEventTs = System.currentTimeMillis();
        }

        Map<String, String> legacyData = new HashMap<>();
        legacyData.put("studyProblemId", studyProblemId.toString());
        if (normalizedTitle != null && !normalizedTitle.isBlank()) {
            legacyData.put("problemTitle", normalizedTitle);
        }
        if (normalizedExternalId != null && !normalizedExternalId.isBlank()) {
            legacyData.put("externalId", normalizedExternalId);
        }
        legacyData.put("updatedAt", LocalDateTime.now().toString());

        redisTemplate.opsForHash().putAll(key, legacyData);
        if (normalizedExternalId == null) {
            redisTemplate.opsForHash().delete(key, "externalId");
        }
        redisTemplate.expire(key, 12, TimeUnit.HOURS);

        Map<String, String> ideData = new HashMap<>();
        ideData.put("studyProblemId", studyProblemId.toString());
        if (normalizedTitle != null && !normalizedTitle.isBlank()) {
            ideData.put("problemTitle", normalizedTitle);
        }
        if (normalizedExternalId != null && !normalizedExternalId.isBlank()) {
            ideData.put("externalId", normalizedExternalId);
        }
        ideData.put("filename", resolvedFilename);
        ideData.put("code", resolvedCode);
        ideData.put("lang", normalizedLanguage);
        ideData.put("eventTs", resolvedEventTs.toString());
        ideData.put("updatedAt", LocalDateTime.now().toString());

        redisTemplate.opsForHash().putAll(activeIdeKey, ideData);
        if (normalizedExternalId == null) {
            redisTemplate.opsForHash().delete(activeIdeKey, "externalId");
        }
        redisTemplate.expire(activeIdeKey, 12, TimeUnit.HOURS);
        studyMemberProgressService.updateLastStudyProblem(studyId, userId, studyProblemId);
    }

    /**
     * Read current active problem for a user in a study.
     */
    public Map<String, Object> getActiveProblem(Long studyId, Long userId) {
        String activeIdeKey = String.format(RedisKeyConst.STUDY_USER_ACTIVE_IDE, studyId, userId);
        Map<Object, Object> entries = redisTemplate.opsForHash().entries(activeIdeKey);

        if (entries != null && !entries.isEmpty()) {
            Object rawStudyProblemId = entries.get("studyProblemId");
            if (rawStudyProblemId != null) {
                Map<String, Object> result = new LinkedHashMap<>();
                try {
                    result.put("studyProblemId", Long.valueOf(rawStudyProblemId.toString()));
                } catch (NumberFormatException e) {
                    return Collections.emptyMap();
                }

                Object rawTitle = entries.get("problemTitle");
                if (rawTitle != null) {
                    result.put("problemTitle", rawTitle.toString());
                }
                Object rawExternalId = entries.get("externalId");
                if (rawExternalId != null) {
                    result.put("externalId", rawExternalId.toString());
                }
                Object rawLang = entries.get("lang");
                if (rawLang != null) {
                    result.put("lang", rawLang.toString());
                }
                Object rawCode = entries.get("code");
                if (rawCode != null) {
                    result.put("code", rawCode.toString());
                }
                Object rawFilename = entries.get("filename");
                if (rawFilename != null) {
                    result.put("filename", rawFilename.toString());
                }
                Object rawEventTs = entries.get("eventTs");
                if (rawEventTs != null) {
                    result.put("eventTs", rawEventTs.toString());
                }
                Object rawUpdatedAt = entries.get("updatedAt");
                if (rawUpdatedAt != null) {
                    result.put("updatedAt", rawUpdatedAt.toString());
                }
                return result;
            }
        }

        String key = String.format(RedisKeyConst.STUDY_USER_ACTIVE_PROBLEM, studyId, userId);
        Map<Object, Object> legacyEntries = redisTemplate.opsForHash().entries(key);

        if (legacyEntries == null || legacyEntries.isEmpty()) {
            return Collections.emptyMap();
        }

        Object rawStudyProblemId = legacyEntries.get("studyProblemId");
        if (rawStudyProblemId == null) {
            return Collections.emptyMap();
        }

        Map<String, Object> result = new LinkedHashMap<>();
        try {
            result.put("studyProblemId", Long.valueOf(rawStudyProblemId.toString()));
        } catch (NumberFormatException e) {
            return Collections.emptyMap();
        }

        Object rawTitle = legacyEntries.get("problemTitle");
        if (rawTitle != null) {
            result.put("problemTitle", rawTitle.toString());
        }
        Object rawExternalId = legacyEntries.get("externalId");
        if (rawExternalId != null) {
            result.put("externalId", rawExternalId.toString());
        }
        Object rawUpdatedAt = legacyEntries.get("updatedAt");
        if (rawUpdatedAt != null) {
            result.put("updatedAt", rawUpdatedAt.toString());
        }
        return result;
    }

    public IdeResponse getActiveIdeSnapshot(Long studyId, Long userId) {
        String key = String.format(RedisKeyConst.STUDY_USER_ACTIVE_IDE, studyId, userId);
        Map<Object, Object> entries = redisTemplate.opsForHash().entries(key);
        if (entries == null || entries.isEmpty()) {
            return null;
        }

        Object rawProblemId = entries.get("studyProblemId");
        if (rawProblemId == null) {
            return null;
        }
        Long problemId;
        try {
            problemId = Long.valueOf(rawProblemId.toString());
        } catch (NumberFormatException e) {
            return null;
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        String lang = entries.get("lang") != null ? entries.get("lang").toString() : "python";
        String filename = entries.get("filename") != null
                ? entries.get("filename").toString()
                : getDefaultFilename(lang);

        return IdeResponse.builder()
                .senderId(userId)
                .senderName(user.getNickname())
                .problemId(problemId)
                .problemTitle((String) entries.getOrDefault("problemTitle", null))
                .externalId((String) entries.getOrDefault("externalId", null))
                .filename(filename)
                .code((String) entries.getOrDefault("code", ""))
                .lang(lang)
                .eventTs(parseEventTs(entries.get("eventTs")))
                .build();
    }

    public Long getActiveProblemId(Long studyId, Long userId) {
        Map<String, Object> activeProblem = getActiveProblem(studyId, userId);
        Object rawStudyProblemId = activeProblem.get("studyProblemId");
        if (rawStudyProblemId == null) {
            return null;
        }
        try {
            return Long.valueOf(rawStudyProblemId.toString());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    public void clearActiveProblem(Long studyId, Long userId) {
        String key = String.format(RedisKeyConst.STUDY_USER_ACTIVE_PROBLEM, studyId, userId);
        String activeIdeKey = String.format(RedisKeyConst.STUDY_USER_ACTIVE_IDE, studyId, userId);
        redisTemplate.delete(key);
        redisTemplate.delete(activeIdeKey);
    }
}
