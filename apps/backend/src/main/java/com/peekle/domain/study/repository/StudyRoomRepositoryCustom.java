package com.peekle.domain.study.repository;

import com.peekle.domain.study.entity.StudyRoom;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface StudyRoomRepositoryCustom {
    Page<StudyRoom> findMyStudyRooms(Long userId, String keyword, Pageable pageable);

    // 스터디 랭킹 조회
    Page<StudyRoom> findRankings(Long userId, String keyword, String scope, Pageable pageable);
}
