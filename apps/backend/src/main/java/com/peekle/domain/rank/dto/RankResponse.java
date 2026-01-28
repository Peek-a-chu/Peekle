package com.peekle.domain.rank.dto;

import com.peekle.domain.study.dto.http.response.StudyMemberResponse;
import lombok.*;

import java.util.List;

@Getter
@Setter // Rank는 조회 후 계산해서 넣어야 하므로 Setter 필요
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RankResponse {

    private int rank;
    private Long studyId;
    private String name;
    private int totalPoint;
    private int memberCount;
    private List<StudyMemberResponse> members;

}
