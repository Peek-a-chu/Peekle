package com.peekle.domain.workbook.service;

import com.peekle.domain.problem.entity.Problem;
import com.peekle.domain.problem.repository.ProblemRepository;
import com.peekle.domain.submission.repository.SubmissionLogRepository;
import com.peekle.domain.user.entity.User;
import com.peekle.domain.user.repository.UserRepository;
import com.peekle.domain.workbook.dto.request.WorkbookCreateRequest;
import com.peekle.domain.workbook.dto.request.WorkbookUpdateRequest;
import com.peekle.domain.workbook.dto.response.*;
import com.peekle.domain.workbook.entity.Workbook;
import com.peekle.domain.workbook.entity.WorkbookBookmark;
import com.peekle.domain.workbook.entity.WorkbookProblem;
import com.peekle.domain.workbook.repository.WorkbookBookmarkRepository;
import com.peekle.domain.workbook.repository.WorkbookProblemRepository;
import com.peekle.domain.workbook.repository.WorkbookRepository;
import com.peekle.global.exception.BusinessException;
import com.peekle.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.IntStream;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WorkbookService {

    private final WorkbookRepository workbookRepository;
    private final WorkbookProblemRepository workbookProblemRepository;
    private final WorkbookBookmarkRepository workbookBookmarkRepository;
    private final ProblemRepository problemRepository;
    private final UserRepository userRepository;
    private final SubmissionLogRepository submissionLogRepository;

    // 문제집 생성
    @Transactional
    public WorkbookResponse createWorkbook(Long userId, WorkbookCreateRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        // 1. 문제집 생성
        Workbook workbook = Workbook.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .creator(user)
                .build();

        workbookRepository.save(workbook);

        // 2. 문제 추가
        if (request.getProblemIds() != null && !request.getProblemIds().isEmpty()) {
            addProblemsToWorkbook(workbook, request.getProblemIds());
        }

        // 3. 응답 생성
        List<WorkbookProblemResponse> problemResponses = getWorkbookProblems(workbook, userId);
        return WorkbookResponse.of(workbook, false, true, problemResponses);
    }

    // 문제집 목록 조회
    public Page<WorkbookListResponse> getWorkbooks(Long userId, String tab, String keyword, String sort, Pageable pageable) {
        Page<Workbook> workbooks;

        // 로그인하지 않은 사용자는 MY/BOOKMARKED 탭 접근 불가 - 빈 결과 반환
        if (userId == null && ("MY".equalsIgnoreCase(tab) || "BOOKMARKED".equalsIgnoreCase(tab))) {
            return new PageImpl<>(List.of(), pageable, 0);
        }

        switch (tab.toUpperCase()) {
            case "MY":
                workbooks = workbookRepository.findMyWorkbooks(userId, keyword, sort, pageable);
                break;
            case "BOOKMARKED":
                workbooks = workbookRepository.findBookmarkedWorkbooks(userId, keyword, sort, pageable);
                break;
            default: // ALL
                workbooks = workbookRepository.findAllActive(keyword, sort, pageable);
                break;
        }

        final User user = userId != null ? userRepository.findById(userId).orElse(null) : null;

        // 모든 문제집의 문제 ID 수집 (solvedCount 계산용)
        List<Long> allProblemIds = workbooks.getContent().stream()
                .flatMap(w -> w.getProblems().stream())
                .map(wp -> wp.getProblem().getId())
                .distinct()
                .toList();

        // 유저가 푼 문제 ID 목록 조회
        Set<Long> solvedProblemIds = (userId != null && !allProblemIds.isEmpty())
                ? new HashSet<>(submissionLogRepository.findSolvedProblemIds(userId, allProblemIds))
                : Set.of();

        List<WorkbookListResponse> content = workbooks.getContent().stream()
                .map(workbook -> {
                    int problemCount = workbook.getProblems().size();
                    int solvedCount = (int) workbook.getProblems().stream()
                            .filter(wp -> solvedProblemIds.contains(wp.getProblem().getId()))
                            .count();
                    boolean isBookmarked = user != null && workbookBookmarkRepository.existsByWorkbookAndUser(workbook, user);
                    boolean isOwner = user != null && workbook.getCreator().getId().equals(userId);
                    return WorkbookListResponse.of(workbook, problemCount, solvedCount, isBookmarked, isOwner);
                })
                .toList();

        return new PageImpl<>(content, pageable, workbooks.getTotalElements());
    }

    // 문제집 상세 조회
    public WorkbookResponse getWorkbook(Long userId, Long workbookId) {
        Workbook workbook = workbookRepository.findById(workbookId)
                .orElseThrow(() -> new BusinessException(ErrorCode.WORKBOOK_NOT_FOUND));

        if (!workbook.isActive()) {
            throw new BusinessException(ErrorCode.WORKBOOK_NOT_FOUND);
        }

        boolean isBookmarked = false;
        boolean isOwner = false;

        // 로그인한 사용자인 경우에만 북마크/소유자 여부 확인
        if (userId != null) {
            User user = userRepository.findById(userId).orElse(null);
            if (user != null) {
                isBookmarked = workbookBookmarkRepository.existsByWorkbookAndUser(workbook, user);
                isOwner = workbook.getCreator().getId().equals(userId);
            }
        }

        List<WorkbookProblemResponse> problemResponses = getWorkbookProblems(workbook, userId);

        return WorkbookResponse.of(workbook, isBookmarked, isOwner, problemResponses);
    }

    // 문제집 수정
    @Transactional
    public WorkbookResponse updateWorkbook(Long userId, Long workbookId, WorkbookUpdateRequest request) {
        Workbook workbook = workbookRepository.findById(workbookId)
                .orElseThrow(() -> new BusinessException(ErrorCode.WORKBOOK_NOT_FOUND));

        // 권한 체크
        if (!workbook.getCreator().getId().equals(userId)) {
            throw new BusinessException(ErrorCode.ACCESS_DENIED);
        }

        // 1. 기본 정보 수정
        workbook.update(request.getTitle(), request.getDescription());

        // 2. 기존 문제 삭제 후 새로 추가
        workbook.clearProblems();
        workbookProblemRepository.deleteByWorkbook(workbook);

        if (request.getProblemIds() != null && !request.getProblemIds().isEmpty()) {
            addProblemsToWorkbook(workbook, request.getProblemIds());
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        boolean isBookmarked = workbookBookmarkRepository.existsByWorkbookAndUser(workbook, user);
        List<WorkbookProblemResponse> problemResponses = getWorkbookProblems(workbook, userId);

        return WorkbookResponse.of(workbook, isBookmarked, true, problemResponses);
    }

    // 문제집 삭제
    @Transactional
    public void deleteWorkbook(Long userId, Long workbookId) {
        Workbook workbook = workbookRepository.findById(workbookId)
                .orElseThrow(() -> new BusinessException(ErrorCode.WORKBOOK_NOT_FOUND));

        // 권한 체크
        if (!workbook.getCreator().getId().equals(userId)) {
            throw new BusinessException(ErrorCode.ACCESS_DENIED);
        }

        workbook.deactivate();
    }

    // 북마크 토글
    @Transactional
    public boolean toggleBookmark(Long userId, Long workbookId) {
        Workbook workbook = workbookRepository.findById(workbookId)
                .orElseThrow(() -> new BusinessException(ErrorCode.WORKBOOK_NOT_FOUND));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        var existingBookmark = workbookBookmarkRepository.findByWorkbookAndUser(workbook, user);

        if (existingBookmark.isPresent()) {
            // 북마크 해제
            workbookBookmarkRepository.delete(existingBookmark.get());
            workbook.decrementBookmarkCount();
            return false;
        } else {
            // 북마크 추가
            WorkbookBookmark bookmark = WorkbookBookmark.builder()
                    .workbook(workbook)
                    .user(user)
                    .build();
            workbookBookmarkRepository.save(bookmark);
            workbook.incrementBookmarkCount();
            return true;
        }
    }

    // 탭별 개수 조회
    public WorkbookCountResponse getWorkbookCounts(Long userId) {
        long all = workbookRepository.countAllActive();
        long my = userId != null ? workbookRepository.countMyWorkbooks(userId) : 0;
        long bookmarked = userId != null ? workbookRepository.countBookmarkedWorkbooks(userId) : 0;
        return WorkbookCountResponse.of(all, my, bookmarked);
    }

    // 문제집에 문제 추가
    private void addProblemsToWorkbook(Workbook workbook, List<Long> problemIds) {
        List<Problem> problems = problemRepository.findAllById(problemIds);

        IntStream.range(0, problemIds.size()).forEach(index -> {
            Long problemId = problemIds.get(index);
            problems.stream()
                    .filter(p -> p.getId().equals(problemId))
                    .findFirst()
                    .ifPresent(problem -> {
                        WorkbookProblem workbookProblem = WorkbookProblem.builder()
                                .workbook(workbook)
                                .problem(problem)
                                .orderIndex(index)
                                .build();
                        workbook.addProblem(workbookProblem);
                    });
        });
    }

    // 문제집의 문제 목록 조회 (유저의 풀이 여부 포함)
    private List<WorkbookProblemResponse> getWorkbookProblems(Workbook workbook, Long userId) {
        List<WorkbookProblem> workbookProblems = workbookProblemRepository.findByWorkbookWithProblem(workbook);

        // 로그인하지 않은 경우: 모든 문제를 미풀이로 표시
        if (userId == null || workbookProblems.isEmpty()) {
            return workbookProblems.stream()
                    .map(wp -> WorkbookProblemResponse.of(wp, false))
                    .toList();
        }

        // 로그인한 경우: 유저가 푼 문제 ID 목록 조회
        List<Long> problemIds = workbookProblems.stream()
                .map(wp -> wp.getProblem().getId())
                .toList();

        Set<Long> solvedProblemIds = new HashSet<>(
                submissionLogRepository.findSolvedProblemIds(userId, problemIds)
        );

        return workbookProblems.stream()
                .map(wp -> WorkbookProblemResponse.of(wp, solvedProblemIds.contains(wp.getProblem().getId())))
                .toList();
    }
}
