package com.peekle.domain.workbook.service;

import com.peekle.domain.game.service.WorkbookPreviewCacheService;
import com.peekle.domain.problem.entity.Problem;
import com.peekle.domain.problem.repository.ProblemRepository;
import com.peekle.domain.submission.repository.SubmissionLogRepository;
import com.peekle.domain.user.entity.User;
import com.peekle.domain.user.repository.UserRepository;
import com.peekle.domain.workbook.dto.request.WorkbookUpdateRequest;
import com.peekle.domain.workbook.entity.Workbook;
import com.peekle.domain.workbook.repository.WorkbookBookmarkRepository;
import com.peekle.domain.workbook.repository.WorkbookProblemRepository;
import com.peekle.domain.workbook.repository.WorkbookRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WorkbookServiceTest {

    @Mock
    private WorkbookRepository workbookRepository;
    @Mock
    private WorkbookProblemRepository workbookProblemRepository;
    @Mock
    private WorkbookBookmarkRepository workbookBookmarkRepository;
    @Mock
    private ProblemRepository problemRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private SubmissionLogRepository submissionLogRepository;
    @Mock
    private WorkbookPreviewCacheService workbookPreviewCacheService;

    private WorkbookService workbookService;

    @BeforeEach
    void setUp() {
        workbookService = new WorkbookService(
                workbookRepository,
                workbookProblemRepository,
                workbookBookmarkRepository,
                problemRepository,
                userRepository,
                submissionLogRepository,
                workbookPreviewCacheService);
    }

    @Test
    void updateWorkbookInvalidatesWorkbookCacheAndWaitingRoomSnapshots() {
        Long userId = 1L;
        Long workbookId = 10L;
        User user = User.builder().id(userId).build();
        Workbook workbook = Workbook.builder().id(workbookId).creator(user).title("old").build();
        Problem problem = problem(100L);
        WorkbookUpdateRequest request = new WorkbookUpdateRequest();
        ReflectionTestUtils.setField(request, "title", "new");
        ReflectionTestUtils.setField(request, "description", "desc");
        ReflectionTestUtils.setField(request, "problemIds", List.of(problem.getId()));

        when(workbookRepository.findById(workbookId)).thenReturn(Optional.of(workbook));
        when(problemRepository.findAllById(List.of(problem.getId()))).thenReturn(List.of(problem));
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(workbookBookmarkRepository.existsByWorkbookAndUser(workbook, user)).thenReturn(false);
        when(workbookProblemRepository.findByWorkbookWithProblem(workbook)).thenReturn(List.of());

        workbookService.updateWorkbook(userId, workbookId, request);

        verify(workbookPreviewCacheService).invalidateWorkbookCacheAndStartSnapshots(workbookId);
    }

    @Test
    void deleteWorkbookInvalidatesWorkbookCacheAndWaitingRoomSnapshots() {
        Long userId = 1L;
        Long workbookId = 10L;
        User user = User.builder().id(userId).build();
        Workbook workbook = Workbook.builder().id(workbookId).creator(user).title("old").build();

        when(workbookRepository.findById(workbookId)).thenReturn(Optional.of(workbook));

        workbookService.deleteWorkbook(userId, workbookId);

        verify(workbookPreviewCacheService).invalidateWorkbookCacheAndStartSnapshots(workbookId);
    }

    @Test
    void addProblemToWorkbookInvalidatesWorkbookCacheAndWaitingRoomSnapshots() {
        Long userId = 1L;
        Long workbookId = 10L;
        Long problemId = 100L;
        User user = User.builder().id(userId).build();
        Workbook workbook = Workbook.builder().id(workbookId).creator(user).title("old").build();

        when(workbookRepository.findById(workbookId)).thenReturn(Optional.of(workbook));
        when(problemRepository.findById(problemId)).thenReturn(Optional.of(problem(problemId)));
        when(workbookRepository.save(any(Workbook.class))).thenReturn(workbook);

        workbookService.addProblemToWorkbook(userId, workbookId, problemId);

        verify(workbookPreviewCacheService).invalidateWorkbookCacheAndStartSnapshots(workbookId);
    }

    private static Problem problem(Long id) {
        return Problem.builder()
                .id(id)
                .externalId(String.valueOf(id))
                .title("problem-" + id)
                .tier("Gold 5")
                .url("https://example.com/problems/" + id)
                .build();
    }
}
