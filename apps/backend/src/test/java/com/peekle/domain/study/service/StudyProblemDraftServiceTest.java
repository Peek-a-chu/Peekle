package com.peekle.domain.study.service;

import com.peekle.domain.study.dto.ide.IdeResponse;
import com.peekle.domain.study.entity.StudyMember;
import com.peekle.domain.study.entity.StudyProblem;
import com.peekle.domain.study.entity.StudyRoom;
import com.peekle.domain.study.repository.StudyMemberRepository;
import com.peekle.domain.study.repository.StudyProblemDraftRepository;
import com.peekle.domain.study.repository.StudyProblemRepository;
import com.peekle.domain.user.entity.User;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class StudyProblemDraftServiceTest {

    @Mock
    private StudyMemberRepository studyMemberRepository;

    @Mock
    private StudyProblemRepository studyProblemRepository;

    @Mock
    private StudyProblemDraftRepository studyProblemDraftRepository;

    @Mock
    private RedisIdeService redisIdeService;

    @InjectMocks
    private StudyProblemDraftService studyProblemDraftService;

    @Test
    void persistActiveProblemFromRedis_doesNotOverwrite_whenCodeMissing() {
        Long studyId = 10L;
        Long userId = 20L;
        Long studyProblemId = 30L;

        when(redisIdeService.getActiveProblem(studyId, userId))
                .thenReturn(Map.of("studyProblemId", studyProblemId));
        when(redisIdeService.getCode(studyId, studyProblemId, userId))
                .thenReturn(null);

        Long result = studyProblemDraftService.persistActiveProblemFromRedis(studyId, userId);

        assertThat(result).isEqualTo(studyProblemId);
        verifyNoInteractions(studyMemberRepository, studyProblemRepository, studyProblemDraftRepository);
    }

    @Test
    void persistActiveProblemFromRedis_savesDraft_whenCodeExists() {
        Long studyId = 11L;
        Long userId = 21L;
        Long studyProblemId = 31L;

        StudyRoom studyRoom = StudyRoom.builder().id(studyId).build();
        User user = User.builder().id(userId).build();
        StudyMember studyMember = StudyMember.builder().id(100L).study(studyRoom).user(user).build();
        StudyProblem studyProblem = StudyProblem.builder().id(studyProblemId).study(studyRoom).build();
        IdeResponse ideResponse = IdeResponse.builder()
                .problemId(studyProblemId)
                .code("print('hello')")
                .lang("python")
                .build();

        when(redisIdeService.getActiveProblem(studyId, userId))
                .thenReturn(Map.of("studyProblemId", studyProblemId));
        when(redisIdeService.getCode(studyId, studyProblemId, userId))
                .thenReturn(ideResponse);
        when(studyMemberRepository.findByStudyAndUser_Id(any(StudyRoom.class), eq(userId)))
                .thenReturn(Optional.of(studyMember));
        when(studyProblemRepository.findById(studyProblemId))
                .thenReturn(Optional.of(studyProblem));
        when(studyProblemDraftRepository.findByStudyMemberAndStudyProblem(studyMember, studyProblem))
                .thenReturn(Optional.empty());

        Long result = studyProblemDraftService.persistActiveProblemFromRedis(studyId, userId);

        assertThat(result).isEqualTo(studyProblemId);

        ArgumentCaptor<com.peekle.domain.study.entity.StudyProblemDraft> draftCaptor = ArgumentCaptor
                .forClass(com.peekle.domain.study.entity.StudyProblemDraft.class);
        verify(studyProblemDraftRepository).save(draftCaptor.capture());
        assertThat(draftCaptor.getValue().getCode()).isEqualTo("print('hello')");
        assertThat(draftCaptor.getValue().getLanguage()).isEqualTo("python");
        verify(studyProblemDraftRepository, never()).save(null);
    }
}
