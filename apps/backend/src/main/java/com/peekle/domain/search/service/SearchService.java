package com.peekle.domain.search.service;

import com.peekle.domain.problem.entity.Problem;
import com.peekle.domain.problem.repository.ProblemRepository;
import com.peekle.domain.search.dto.*;
import com.peekle.domain.user.entity.User;
import com.peekle.domain.user.repository.UserRepository;
import com.peekle.domain.workbook.entity.Workbook;
import com.peekle.domain.workbook.repository.WorkbookRepository;
import com.peekle.global.exception.BusinessException;
import com.peekle.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SearchService {

    private final ProblemRepository problemRepository;
    private final WorkbookRepository workbookRepository;
    private final UserRepository userRepository;

    // 카데고리에 따른 분기처리
    public SearchResponse search(SearchRequest request, Pageable pageable) {
        if (request.getCategory().equals("ALL")) {
            return searchAll(request);
        } else {
            return searchByCategory(request, pageable);
        }
    }

    // 통합검색 문제(상위 5개), 문제집(상위 6개), 유저(상위 6명) ** 바뀔수있음 **
    private SearchResponse searchAll(SearchRequest request) {
        String keyword = request.getKeyword();

        // Problem
        Page<Problem> problems = problemRepository.searchProblems(keyword, request.getTiers(), request.getTags(), PageRequest.of(0, 5));

        // Workbook
        Page<Workbook> workbooks = workbookRepository.findAllActive(keyword, "LATEST", PageRequest.of(0, 6));
        // User
        Page<User> users = userRepository.searchUsers(keyword, PageRequest.of(0, 6));
        // 응답 조립
        return SearchResponse.builder()
                .category("ALL")
                .counts(SearchResponse.SearchCounts.builder()
                        .problem(problems.getTotalElements())
                        .workbook(workbooks.getTotalElements())
                        .user(users.getTotalElements())
                        .build())
                .data(SearchResponse.SearchData.builder()
                        .problems(problems.getContent().stream().map(SearchProblemResponse::from).collect(Collectors.toList()))
                        .workbooks(workbooks.getContent().stream().map(SearchWorkbookResponse::from).collect(Collectors.toList()))
                        .users(users.getContent().stream().map(SearchUserResponse::from).collect(Collectors.toList()))
                        .build())
                .pagination(null) // ALL 탭에서는 페이징 정보 불필요
                .build();
    }

    private SearchResponse searchByCategory(SearchRequest request, Pageable pageable) {
        Page<?> pageResult;
        List<SearchProblemResponse> problemList = null;
        List<SearchWorkbookResponse> workbookList = null;
        List<SearchUserResponse> userList = null;
        switch (request.getCategory()) {
            case "PROBLEM":
                Page<Problem> problems = problemRepository.searchProblems(request.getKeyword(), request.getTiers(), request.getTags(), pageable);
                problemList = problems.getContent().stream().map(SearchProblemResponse::from).collect(Collectors.toList());
                pageResult = problems;
                break;
            case "WORKBOOK":
                // 기존 findAllActive 사용 (정렬은 Pageable에 포함되어 있다고 가정하거나 고정값 사용)
                Page<Workbook> workbooks = workbookRepository.findAllActive(request.getKeyword(), "LATEST", pageable);
                workbookList = workbooks.getContent().stream().map(SearchWorkbookResponse::from).collect(Collectors.toList());
                pageResult = workbooks;
                break;
            case "USER":
                Page<User> users = userRepository.searchUsers(request.getKeyword(), pageable);
                userList = users.getContent().stream().map(SearchUserResponse::from).collect(Collectors.toList());
                pageResult = users;
                break;
            default:
                throw new BusinessException(ErrorCode.INVALID_INPUT_VALUE);
        }
        return SearchResponse.builder()
                .category(request.getCategory())
                .counts(null) // 상세 탭에서는 전체 통합 카운트는 굳이 필요 없음 (PageInfo의 totalElements 사용)
                .data(SearchResponse.SearchData.builder()
                        .problems(problemList)
                        .workbooks(workbookList)
                        .users(userList)
                        .build())
                .pagination(SearchResponse.PageInfo.builder()
                        .page(pageResult.getNumber())
                        .size(pageResult.getSize())
                        .totalElements(pageResult.getTotalElements())
                        .totalPages(pageResult.getTotalPages())
                        .build())
                .build();
    }

}
