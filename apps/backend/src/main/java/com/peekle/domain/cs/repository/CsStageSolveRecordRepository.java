package com.peekle.domain.cs.repository;

import com.peekle.domain.cs.entity.CsStageSolveRecord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CsStageSolveRecordRepository extends JpaRepository<CsStageSolveRecord, Long> {

    Optional<CsStageSolveRecord> findByUser_IdAndStage_Id(Long userId, Long stageId);

    List<CsStageSolveRecord> findByUser_IdAndStage_IdIn(Long userId, List<Long> stageIds);
}
