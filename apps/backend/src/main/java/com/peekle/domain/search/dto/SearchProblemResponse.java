package com.peekle.domain.search.dto;

import com.peekle.domain.problem.entity.Problem;
import com.peekle.domain.problem.entity.Tag;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.stream.Collectors;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SearchProblemResponse {

    private Long problemId;
    private String title;
    private String tier;
    private List<String> tags;
    private String url;
    private String externalId;

    public static SearchProblemResponse from(Problem problem) {
        return SearchProblemResponse.builder()
                .problemId(problem.getId())
                .title(problem.getTitle())
                .tier(problem.getTier())
                .tags(problem.getTags().stream().map(Tag::getName).collect(Collectors.toList()))
                .url(problem.getUrl())
                .externalId(problem.getExternalId())
                .build();
    }
}
