package com.peekle.domain.study.service;

import com.peekle.domain.study.entity.StudyMember;
import com.peekle.domain.study.entity.StudyRoom;
import com.peekle.domain.study.repository.StudyMemberRepository;
import com.peekle.domain.study.repository.StudyRoomRepository;
import com.peekle.domain.user.entity.User;
import com.peekle.global.exception.BusinessException;
import com.peekle.global.exception.ErrorCode;
import java.security.SecureRandom;
import com.peekle.domain.study.dto.request.StudyRoomCreateRequest;
import com.peekle.domain.study.dto.request.StudyRoomJoinRequest;
import com.peekle.domain.study.dto.response.StudyInviteCodeResponse;
import com.peekle.domain.study.dto.response.StudyRoomCreateResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StudyRoomService {

    private final StudyRoomRepository studyRoomRepository;
    private final StudyMemberRepository studyMemberRepository;
    private final InviteCodeService inviteCodeService;

    @Transactional
    public StudyRoomCreateResponse createStudyRoom(User user, StudyRoomCreateRequest request) {
        // 1. 방 생성
        StudyRoom studyRoom = StudyRoom.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .owner(user)
                .isActive(true)
                .build();

        studyRoomRepository.save(studyRoom);

        // 2. 방장(Owner) 등록
        StudyMember ownerMember = StudyMember.builder()
                .study(studyRoom)
                .user(user)
                .role(StudyMember.StudyRole.OWNER)
                .build();

        studyMemberRepository.save(ownerMember);

        // 3. 초대 코드 생성 및 Redis 저장
        String inviteCode = generateInviteCode();
        inviteCodeService.saveInviteCode(inviteCode, studyRoom.getId());

        return StudyRoomCreateResponse.of(inviteCode);
    }

    @Transactional
    public void joinStudyRoom(User user, StudyRoomJoinRequest request) {
        // 1. 초대 코드 검증 (Redis)
        String inviteCode = request.getInviteCode();
        Long studyRoomId = inviteCodeService.getStudyRoomId(inviteCode);

        // 2. 스터디 방 조회
        StudyRoom studyRoom = studyRoomRepository.findById(studyRoomId)
                .orElseThrow(() -> new BusinessException(ErrorCode.STUDY_ROOM_NOT_FOUND));

        // 3. 이미 참여 중인지 확인
        if (studyMemberRepository.existsByStudyAndUser(studyRoom, user)) {
            throw new BusinessException(ErrorCode.ALREADY_JOINED_STUDY);
        }

        // 4. 멤버 등록
        StudyMember member = StudyMember.builder()
                .study(studyRoom)
                .user(user)
                .role(StudyMember.StudyRole.MEMBER)
                .build();

        studyMemberRepository.save(member);
    }

    @Transactional
    public StudyInviteCodeResponse createInviteCode(User user, Long studyRoomId) {
        // 1. 스터디 방 조회
        StudyRoom studyRoom = studyRoomRepository.findById(studyRoomId)
                .orElseThrow(() -> new BusinessException(ErrorCode.STUDY_ROOM_NOT_FOUND));

        // 2. 멤버 여부 확인 (방에 참여한 사람만 초대 코드를 만들 수 있음)
        if (!studyMemberRepository.existsByStudyAndUser(studyRoom, user)) {
            // TODO: 권한 관련 에러 코드가 없다면 추가 필요. 현재는 적절한게 없으면 UNAUTHORIZED 혹은 FORBIDDEN 의미의 에러
            // 일단은 BusinessException(ErrorCode.UNAUTHORIZED) 사용 혹은 새 에러 코드 추가
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }

        // 3. 초대 코드 생성 및 Redis 저장
        String inviteCode = generateInviteCode();
        inviteCodeService.saveInviteCode(inviteCode, studyRoomId);

        return StudyInviteCodeResponse.of(inviteCode);
    }

    // 초대코드 생성 로직
    private String generateInviteCode() {
        SecureRandom random = new SecureRandom();
        StringBuilder sb = new StringBuilder(8);
        String characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        for (int i = 0; i < 8; i++) {
            sb.append(characters.charAt(random.nextInt(characters.length())));
        }
        return sb.toString();
    }
}
