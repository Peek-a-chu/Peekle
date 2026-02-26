package com.peekle.domain.study.aop;

import com.peekle.domain.study.entity.StudyMember;
import com.peekle.domain.study.entity.StudyRoom;
import com.peekle.domain.study.repository.StudyMemberRepository;
import com.peekle.domain.study.repository.StudyRoomRepository;
import com.peekle.global.exception.BusinessException;
import com.peekle.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.springframework.stereotype.Component;

@Aspect
@Component
@RequiredArgsConstructor
public class StudyOwnerCheckAspect {

    private final StudyMemberRepository studyMemberRepository;
    private final StudyRoomRepository studyRoomRepository;

    @Before("@annotation(com.peekle.domain.study.aop.CheckStudyOwner)")
    public void checkOwner(JoinPoint joinPoint) {
        Object[] args = joinPoint.getArgs();
        Long userId = null;
        Long studyId = null;

        if (args.length > 0 && args[0] instanceof Long) {
            userId = (Long) args[0];
        }

        if (args.length > 1 && args[1] instanceof Long) {
            studyId = (Long) args[1];
        }

        if (studyId == null || userId == null) {
            return;
        }

        StudyRoom studyRoom = studyRoomRepository.findById(studyId)
                .orElseThrow(() -> new BusinessException(ErrorCode.STUDY_ROOM_NOT_FOUND));

        StudyMember member = studyMemberRepository.findByStudyAndUser_Id(studyRoom, userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.UNAUTHORIZED));

        if (member.getRole() != StudyMember.StudyRole.OWNER) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }
    }
}
