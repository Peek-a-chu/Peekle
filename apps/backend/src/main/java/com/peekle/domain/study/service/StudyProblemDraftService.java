package com.peekle.domain.study.service;

import com.peekle.domain.study.dto.ide.IdeResponse;
import com.peekle.domain.study.dto.ide.StudyProblemDraftResponse;
import com.peekle.domain.study.entity.StudyMember;
import com.peekle.domain.study.entity.StudyProblem;
import com.peekle.domain.study.entity.StudyProblemDraft;
import com.peekle.domain.study.entity.StudyRoom;
import com.peekle.domain.study.repository.StudyMemberRepository;
import com.peekle.domain.study.repository.StudyProblemDraftRepository;
import com.peekle.domain.study.repository.StudyProblemRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class StudyProblemDraftService {

    private final StudyMemberRepository studyMemberRepository;
    private final StudyProblemRepository studyProblemRepository;
    private final StudyProblemDraftRepository studyProblemDraftRepository;
    private final RedisIdeService redisIdeService;

    @Transactional
    public void saveDraft(Long studyId, Long userId, Long studyProblemId, String code, String language) {
        Optional<StudyMember> studyMemberOpt = studyMemberRepository.findByStudyAndUser_Id(
                StudyRoom.builder().id(studyId).build(),
                userId);
        if (studyMemberOpt.isEmpty()) {
            return;
        }

        Optional<StudyProblem> studyProblemOpt = studyProblemRepository.findById(studyProblemId);
        if (studyProblemOpt.isEmpty()) {
            return;
        }

        StudyProblem studyProblem = studyProblemOpt.get();
        if (studyProblem.getStudy() == null || !studyId.equals(studyProblem.getStudy().getId())) {
            return;
        }

        StudyMember studyMember = studyMemberOpt.get();
        StudyProblemDraft draft = studyProblemDraftRepository
                .findByStudyMemberAndStudyProblem(studyMember, studyProblem)
                .orElseGet(() -> StudyProblemDraft.builder()
                        .studyMember(studyMember)
                        .studyProblem(studyProblem)
                        .code(code)
                        .language(language)
                        .build());

        draft.updateDraft(code, language);
        studyProblemDraftRepository.save(draft);
    }

    @Transactional(readOnly = true)
    public Optional<StudyProblemDraftResponse> getDraft(Long studyId, Long userId, Long studyProblemId) {
        Optional<StudyMember> studyMemberOpt = studyMemberRepository.findByStudyAndUser_Id(
                StudyRoom.builder().id(studyId).build(),
                userId);
        if (studyMemberOpt.isEmpty()) {
            return Optional.empty();
        }

        Optional<StudyProblem> studyProblemOpt = studyProblemRepository.findById(studyProblemId);
        if (studyProblemOpt.isEmpty()) {
            return Optional.empty();
        }

        StudyProblem studyProblem = studyProblemOpt.get();
        if (studyProblem.getStudy() == null || !studyId.equals(studyProblem.getStudy().getId())) {
            return Optional.empty();
        }

        StudyMember studyMember = studyMemberOpt.get();
        return studyProblemDraftRepository.findByStudyMemberAndStudyProblem(studyMember, studyProblem)
                .map(draft -> StudyProblemDraftResponse.builder()
                        .studyProblemId(studyProblemId)
                        .code(draft.getCode())
                        .language(draft.getLanguage())
                        .updatedAt(draft.getUpdatedAt())
                        .build());
    }

    @Transactional
    public Long persistActiveProblemFromRedis(Long studyId, Long userId) {
        IdeResponse activeSnapshot = redisIdeService.getActiveIdeSnapshot(studyId, userId);
        if (activeSnapshot != null && activeSnapshot.getProblemId() != null && activeSnapshot.getProblemId() > 0) {
            Long studyProblemId = activeSnapshot.getProblemId();
            String code = activeSnapshot.getCode() != null ? activeSnapshot.getCode() : "";
            String language = activeSnapshot.getLang();

            saveDraft(studyId, userId, studyProblemId, code, language);
            return studyProblemId;
        }

        Map<String, Object> activeProblem = redisIdeService.getActiveProblem(studyId, userId);
        if (activeProblem == null || activeProblem.isEmpty()) {
            return null;
        }

        Long studyProblemId = parseLong(activeProblem.get("studyProblemId"));
        if (studyProblemId == null || studyProblemId <= 0) {
            return null;
        }

        IdeResponse ideResponse = redisIdeService.getCode(studyId, studyProblemId, userId);
        if (ideResponse == null) {
            // Do not overwrite existing draft when only active-problem metadata exists.
            return studyProblemId;
        }

        String code = ideResponse != null && ideResponse.getCode() != null ? ideResponse.getCode() : "";
        String language = ideResponse != null ? ideResponse.getLang() : null;

        saveDraft(studyId, userId, studyProblemId, code, language);
        return studyProblemId;
    }

    private Long parseLong(Object value) {
        if (value == null) {
            return null;
        }
        try {
            return Long.valueOf(value.toString());
        } catch (NumberFormatException e) {
            log.warn("Failed to parse long value: {}", value);
            return null;
        }
    }
}
