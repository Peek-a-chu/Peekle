package com.peekle.domain.rank.service;

import com.peekle.domain.rank.dto.RankResponse;
import com.peekle.domain.study.dto.http.response.StudyMemberResponse;
import com.peekle.domain.study.entity.StudyMember;
import com.peekle.domain.study.entity.StudyRoom;
import com.peekle.domain.study.repository.StudyMemberRepository;
import com.peekle.domain.study.repository.StudyRoomRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RankService {

    private final StudyRoomRepository studyRoomRepository;
    private final StudyMemberRepository studyMemberRepository;

    public Page<RankResponse> getRanking(Long userId, String keyword, String scope, Pageable pageable) {

        // 스터디 랭킹 조회
        Page<StudyRoom> studyPage = studyRoomRepository.findRankings(userId, keyword, scope, pageable);

        if(studyPage.isEmpty()) {
            return Page.empty(pageable);
        }

        // studyId 추출
        List<Long> studyIds = studyPage.getContent().stream().map(StudyRoom::getId).toList();

        // 스터디 멤버 조회
        List<StudyMember> members = studyMemberRepository.findAllByStudyIdIn(studyIds);

        Map<Long, List<StudyMemberResponse>> membersByStudyId = members.stream()
                .collect(Collectors.groupingBy(
                        m -> m.getStudy().getId(),
                        Collectors.mapping(
                                m -> StudyMemberResponse.of(m, false),
                                Collectors.toList()
                        )
                ));

        // 응답 DTO 변환 (랭킹 계산 포함)
        List<StudyRoom> studies = studyPage.getContent();
        List<RankResponse> content = new ArrayList<>();

        long offset = studyPage.getPageable().getOffset();

        for (int i = 0; i < studies.size(); i++) {
            StudyRoom study = studies.get(i);

            // 랭킹 계산: (이전 페이지까지의 개수) + (현재 리스트 인덱스) + 1
            int rank = (int) (offset + i + 1);

            List<StudyMemberResponse> studyMembers = membersByStudyId.getOrDefault(study.getId(), List.of());
            content.add(RankResponse.builder()
                    .rank(rank)
                    .studyId(study.getId())
                    .name(study.getTitle())
                    .totalPoint(study.getRankingPoint())
                    .memberCount(studyMembers.size()) // 실제 멤버 수
                    .members(studyMembers)
                    .build());
        }

        return new PageImpl<>(content, pageable, studyPage.getTotalElements());
    }
}
