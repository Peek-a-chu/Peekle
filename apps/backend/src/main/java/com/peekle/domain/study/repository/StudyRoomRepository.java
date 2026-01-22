package com.peekle.domain.study.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.peekle.domain.study.entity.StudyRoom;

public interface StudyRoomRepository extends JpaRepository<StudyRoom, Long>, StudyRoomRepositoryCustom {

}
