package com.peekle.domain.study.repository;

import com.peekle.domain.study.entity.StudyRoom;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface StudyRoomRepositoryCustom {
    Page<StudyRoom> findMyStudyRooms(Long userId, String keyword, Pageable pageable);

    // 스터디 랭킹 조회
    Page<StudyRoom> findRankings(Long userId, String keyword, String scope, Pageable pageable);

    // 내 스터디의 전체 랭킹 조회 (나보다 점수가 높은 스터디 개수 + 1)
    long countHigherRankStudies(int rankingPoint, Long studyId);
}
