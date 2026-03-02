package com.peekle.domain.study.dto.response;

import com.peekle.domain.study.entity.Testcase;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TestcaseResponse {
    private String id;
    private String input;
    private String expectedOutput;

    public static TestcaseResponse from(Testcase testcase) {
        return TestcaseResponse.builder()
                .id(testcase.getId().toString())
                .input(testcase.getInput())
                .expectedOutput(testcase.getExpectedOutput())
                .build();
    }
}
