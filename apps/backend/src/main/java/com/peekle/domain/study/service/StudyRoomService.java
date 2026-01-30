package com.peekle.domain.study.service;

import com.peekle.domain.study.aop.CheckStudyOwner;
import com.peekle.domain.study.dto.http.request.StudyRoomCreateRequest;
import com.peekle.domain.study.dto.http.request.StudyRoomJoinRequest;
import com.peekle.domain.study.dto.http.request.StudyRoomUpdateRequest;
import com.peekle.domain.study.dto.http.response.StudyInviteCodeResponse;
import com.peekle.domain.study.dto.http.response.StudyMemberResponse;
import com.peekle.domain.study.dto.http.response.StudyRoomCreateResponse;
import com.peekle.domain.study.dto.http.response.StudyRoomListResponse;
import com.peekle.domain.study.dto.http.response.StudyRoomResponse;
import com.peekle.domain.study.entity.StudyMember;
import com.peekle.domain.study.entity.StudyRoom;
import com.peekle.domain.study.repository.StudyMemberRepository;
import com.peekle.domain.study.repository.StudyRoomRepository;
import com.peekle.domain.submission.dto.SubmissionRequest;
import com.peekle.domain.submission.dto.SubmissionResponse;
import com.peekle.domain.submission.service.SubmissionService;
import com.peekle.domain.user.entity.User;
import com.peekle.domain.user.repository.UserRepository;
import com.peekle.global.exception.BusinessException;
import com.peekle.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StudyRoomService {

        private final StudyRoomRepository studyRoomRepository;
        private final StudyMemberRepository studyMemberRepository;
        private final InviteCodeService inviteCodeService;
        private final RedisTemplate<String, String> redisTemplate;
        private final UserRepository userRepository;
        private final SubmissionService submissionService;

        // 스터디 방 생성 (초대코드 반환)
        @Transactional
        public StudyRoomCreateResponse createStudyRoom(Long userId, StudyRoomCreateRequest request) {
                User user = userRepository.findById(userId)
                                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

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

        // 내 스터디 목록 조회
        public Page<StudyRoomListResponse> getMyStudyRooms(Long userId, String keyword, Pageable pageable) {
                // 1. 내 스터디 방 목록 조회 (Paging)
                Page<StudyRoom> studyRooms = studyRoomRepository.findMyStudyRooms(userId, keyword, pageable);

                if (studyRooms.isEmpty()) {
                        return Page.empty(pageable);
                }

                // 2. 조회된 스터디 방 ID 목록 추출
                List<Long> studyRoomIds = studyRooms.getContent().stream()
                                .map(StudyRoom::getId)
                                .toList();

                // 3. 각 스터디 방의 멤버 조회 (Batch Fetch)
                List<StudyMember> members = studyMemberRepository.findAllByStudyIdIn(studyRoomIds);

                // 4. 스터디 방 별로 멤버 그룹화
                Map<Long, List<StudyMember>> membersByStudyId = members.stream()
                                .collect(Collectors.groupingBy(m -> m.getStudy().getId()));

                // 5. Response DTO 변환
                List<StudyRoomListResponse> content = studyRooms.getContent().stream()
                                .map(studyRoom -> {
                                        List<StudyMember> studyMembers = membersByStudyId.getOrDefault(
                                                        studyRoom.getId(),
                                                        Collections.emptyList());
                                        int memberCount = studyMembers.size();

                                        // 프로필 이미지 (실제 데이터 사용) - 최대 3개
                                        List<String> profileImages = studyMembers.stream()
                                                        .limit(3)
                                                        .map(m -> {
                                                                String img = m.getUser().getProfileImgThumb();
                                                                if (img == null) {
                                                                        img = m.getUser().getProfileImg();
                                                                }
                                                                return img;
                                                        })
                                                        .toList();

                                        return StudyRoomListResponse.of(studyRoom, memberCount, profileImages);
                                }).toList();

                return new PageImpl<>(content, pageable, studyRooms.getTotalElements());
        }

        // 스터디 방 상세 조회
        @Transactional(readOnly = true)
        public StudyRoomResponse getStudyRoom(Long userId, Long studyRoomId) {
                StudyRoom studyRoom = studyRoomRepository.findById(studyRoomId)
                                .orElseThrow(() -> new BusinessException(ErrorCode.STUDY_ROOM_NOT_FOUND));

                // 이미 멤버라면 스터디 상세 정보 반환 (멤버 목록 포함)
                if (studyMemberRepository.existsByStudyAndUser_Id(studyRoom, userId)) {
                        return buildStudyRoomResponse(studyRoom, userId);
                }

                // 멤버가 아니라면 접근 거부
                throw new BusinessException(ErrorCode.ACCESS_DENIED);
        }

        // 스터디 방 가입 (초대코드 사용)
        @Transactional
        public StudyRoomResponse joinStudyRoom(Long userId, StudyRoomJoinRequest request) {
                // 1. 초대 코드 검증 (Redis)
                String inviteCode = request.getInviteCode();
                Long studyRoomId = inviteCodeService.getStudyRoomId(inviteCode);

                // 2. 스터디 방 조회
                StudyRoom studyRoom = studyRoomRepository.findById(studyRoomId)
                                .orElseThrow(() -> new BusinessException(ErrorCode.STUDY_ROOM_NOT_FOUND));

                // 3. 이미 참여 중인지 확인
                if (studyMemberRepository.existsByStudyAndUser_Id(studyRoom, userId)) {
                        throw new BusinessException(ErrorCode.ALREADY_JOINED_STUDY);
                }

                // 4. (New) 다른 스터디 참여 중인지 확인
                if (studyMemberRepository.existsByUser_Id(userId)) {
                        throw new BusinessException(ErrorCode.ALREADY_PARTICIPATING_IN_OTHER_STUDY);
                }

                User user = userRepository.findById(userId)
                                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

                // 5. 멤버 등록
                StudyMember member = StudyMember.builder()
                                .study(studyRoom)
                                .user(user)
                                .role(StudyMember.StudyRole.MEMBER)
                                .build();

                studyMemberRepository.save(member);

                return buildStudyRoomResponse(studyRoom, userId);
        }

        // 스터디 방 초대코드 생성 (방에 참여한 사람만 가능)
        @Transactional
        public StudyInviteCodeResponse createInviteCode(Long userId, Long studyRoomId) {
                // 1. 스터디 방 조회
                StudyRoom studyRoom = studyRoomRepository.findById(studyRoomId)
                                .orElseThrow(() -> new BusinessException(ErrorCode.STUDY_ROOM_NOT_FOUND));

                // 2. 멤버 여부 확인 (방에 참여한 사람만 초대 코드를 만들 수 있음)
                if (!studyMemberRepository.existsByStudyAndUser_Id(studyRoom, userId)) {
                        throw new BusinessException(ErrorCode.ACCESS_DENIED);
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

        // 스터디 방 정보 수정
        @Transactional
        @CheckStudyOwner
        public void updateStudyRoom(Long userId, Long studyId, StudyRoomUpdateRequest request) {
                StudyRoom studyRoom = studyRoomRepository.findById(studyId)
                                .orElseThrow(() -> new BusinessException(ErrorCode.STUDY_ROOM_NOT_FOUND));

                studyRoom.update(request.getTitle(), request.getDescription());
        }

        // 스터디 방 삭제 (Soft Delete)
        @Transactional
        @CheckStudyOwner
        public void deleteStudyRoom(Long userId, Long studyId) {
                StudyRoom studyRoom = studyRoomRepository.findById(studyId)
                                .orElseThrow(() -> new BusinessException(ErrorCode.STUDY_ROOM_NOT_FOUND));

                // 1. 멤버 전체 삭제 (방 폭파)
                studyMemberRepository.deleteByStudy(studyRoom);

                // 2. 방 비활성화 (Soft Delete)
                studyRoom.deactivate();
        }

        // 스터디 탈퇴 (스스로 나가기)
        @Transactional
        public void leaveStudyRoom(Long userId, Long studyId) {
                StudyRoom studyRoom = studyRoomRepository.findById(studyId)
                                .orElseThrow(() -> new BusinessException(ErrorCode.STUDY_ROOM_NOT_FOUND));

                StudyMember member = studyMemberRepository.findByStudyAndUser_Id(studyRoom, userId)
                                .orElseThrow(() -> new BusinessException(ErrorCode.ACCESS_DENIED));

                studyMemberRepository.delete(member);
        }

        // 멤버 강퇴 (UserId 기반)
        @Transactional
        @CheckStudyOwner
        public void kickMemberByUserId(Long userId, Long studyId, Long targetUserId) {
                StudyRoom studyRoom = studyRoomRepository.findById(studyId)
                                .orElseThrow(() -> new BusinessException(ErrorCode.STUDY_ROOM_NOT_FOUND));

                StudyMember targetMember = studyMemberRepository.findByStudyAndUser_Id(studyRoom, targetUserId)
                                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

                studyMemberRepository.delete(targetMember);
        }

        // 방장 권한 위임
        @Transactional
        @CheckStudyOwner
        public void delegateLeader(Long userId, Long studyId, Long targetUserId) {
                StudyRoom studyRoom = studyRoomRepository.findById(studyId)
                                .orElseThrow(() -> new BusinessException(ErrorCode.STUDY_ROOM_NOT_FOUND));

                // 1. 현재 방장(userId) 조회
                StudyMember currentOwner = studyMemberRepository.findByStudyAndUser_Id(studyRoom, userId)
                                .orElseThrow(() -> new BusinessException(ErrorCode.ACCESS_DENIED));

                // 2. 대상 멤버 조회
                StudyMember targetMember = studyMemberRepository.findByStudyAndUser_Id(studyRoom, targetUserId)
                                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

                currentOwner.updateRole(StudyMember.StudyRole.MEMBER);
                targetMember.updateRole(StudyMember.StudyRole.OWNER);

                // 3. 스터디 방 Owner 필드 업데이트 (Response DTO용)
                studyRoom.delegateOwner(targetMember.getUser());
        }

        private StudyRoomResponse buildStudyRoomResponse(StudyRoom studyRoom, Long currentUserId) {
                // 1. 전체 멤버 조회
                List<StudyMember> members = studyMemberRepository.findAllByStudy(studyRoom);

                // 2. Redis Presence 조회
                String onlineUsersKey = "study:" + studyRoom.getId() + ":online_users";
                java.util.Set<String> onlineUserIds = redisTemplate.opsForSet().members(onlineUsersKey);
                if (onlineUserIds == null) {
                        onlineUserIds = java.util.Collections.emptySet();
                }

                final java.util.Set<String> finalOnlineUserIds = onlineUserIds;

                // 3. Response 매핑
                List<StudyMemberResponse> memberResponses = members.stream()
                                .map(member -> StudyMemberResponse.of(member,
                                                finalOnlineUserIds.contains(String.valueOf(member.getUser().getId()))))
                                .collect(Collectors.toList());

                return StudyRoomResponse.from(studyRoom, memberResponses, currentUserId);
        }

        @Transactional
        public SubmissionResponse submitStudyProblem(Long studyId, SubmissionRequest request) {
                System.out.println("[StudyRoomService] Processing study submission for studyId: " + studyId);

                // 1. 일반 제출 처리 (검증 및 저장)
                SubmissionResponse response = submissionService.saveGeneralSubmission(request);

                if (response.isSuccess()) {
                        System.out.println("[StudyRoomService] Submission logic successful. Now marking study status.");
                        // TODO: 3단계 - 스터디 현황 반영 로직 (StudyMemberProblemStatus 저장 등)
                        // 현재는 실시간 반영(WebSocket)은 제외하고 제출 연동까지만 완료
                } else {
                        System.out.println("[StudyRoomService] Submission logic failed: " + response.getMessage());
                }

                return response;
        }
}
