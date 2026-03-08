package com.peekle.domain.submission.service;

import com.peekle.domain.study.entity.StudyRoom;
import com.peekle.domain.study.repository.StudyMemberRepository;
import com.peekle.domain.submission.dto.SubmissionCommentCreateRequest;
import com.peekle.domain.submission.dto.SubmissionCommentResponse;
import com.peekle.domain.submission.dto.SubmissionCommentUpdateRequest;
import com.peekle.domain.submission.entity.SubmissionComment;
import com.peekle.domain.submission.entity.SubmissionLog;
import com.peekle.domain.submission.enums.SubmissionCommentType;
import com.peekle.domain.submission.repository.SubmissionCommentRepository;
import com.peekle.domain.submission.repository.SubmissionLogRepository;
import com.peekle.domain.user.entity.User;
import com.peekle.domain.user.repository.UserRepository;
import com.peekle.global.exception.BusinessException;
import com.peekle.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SubmissionCommentService {

    private final SubmissionLogRepository submissionLogRepository;
    private final SubmissionCommentRepository submissionCommentRepository;
    private final StudyMemberRepository studyMemberRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<SubmissionCommentResponse> getComments(Long studyId, Long submissionId, Long requesterId) {
        validateStudyMember(studyId, requesterId);
        SubmissionLog submission = getSubmissionInStudy(studyId, submissionId);

        return submissionCommentRepository.findAllBySubmissionIdWithUser(submission.getId())
                .stream()
                .map(SubmissionCommentResponse::from)
                .toList();
    }

    @Transactional
    public SubmissionCommentResponse createComment(
            Long studyId,
            Long submissionId,
            Long requesterId,
            SubmissionCommentCreateRequest request) {
        validateStudyMember(studyId, requesterId);
        SubmissionLog submission = getSubmissionInStudy(studyId, submissionId);
        User author = userRepository.findById(requesterId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        SubmissionComment parent = null;
        if (request.getParentId() != null) {
            parent = submissionCommentRepository.findByIdAndSubmission_Id(request.getParentId(), submissionId)
                    .orElseThrow(() -> new BusinessException(ErrorCode.INVALID_INPUT_VALUE));
        }

        SubmissionCommentType commentType = resolveCommentType(request.getType(), parent);
        if (parent != null && parent.getCommentType() != commentType) {
            throw new BusinessException(ErrorCode.INVALID_INPUT_VALUE);
        }

        String content = request.getContent() == null ? "" : request.getContent().trim();
        if (content.isEmpty()) {
            throw new BusinessException(ErrorCode.INVALID_INPUT_VALUE);
        }

        Integer lineStart = request.getLineStart();
        Integer lineEnd = request.getLineEnd();

        if (commentType == SubmissionCommentType.INLINE) {
            int maxLine = countCodeLines(submission.getCode());

            if (lineStart == null && parent != null) {
                lineStart = parent.getLineStart();
            }
            if (lineEnd == null && parent != null) {
                lineEnd = parent.getLineEnd();
            }
            if (lineStart == null) {
                throw new BusinessException(ErrorCode.INVALID_INPUT_VALUE);
            }
            if (lineEnd == null) {
                lineEnd = lineStart;
            }

            validateLineRange(lineStart, lineEnd, maxLine);
        } else {
            lineStart = 1;
            lineEnd = 1;
        }

        SubmissionComment saved = submissionCommentRepository.save(
                SubmissionComment.builder()
                        .submission(submission)
                        .user(author)
                        .parent(parent)
                        .commentType(commentType)
                        .lineStart(lineStart)
                        .lineEnd(lineEnd)
                        .content(content)
                        .build());

        return SubmissionCommentResponse.from(saved);
    }

    @Transactional
    public void deleteComment(Long studyId, Long submissionId, Long commentId, Long requesterId) {
        validateStudyMember(studyId, requesterId);
        getSubmissionInStudy(studyId, submissionId);

        SubmissionComment target = submissionCommentRepository.findByIdAndSubmission_Id(commentId, submissionId)
                .orElseThrow(() -> new BusinessException(ErrorCode.INVALID_INPUT_VALUE));

        if (!target.getUser().getId().equals(requesterId)) {
            throw new BusinessException(ErrorCode.ACCESS_DENIED);
        }

        SubmissionComment parent = target.getParent();
        boolean hasChildren = submissionCommentRepository.existsByParent_Id(target.getId());

        if (hasChildren) {
            target.markDeleted();
            return;
        }

        submissionCommentRepository.delete(target);
        cleanupDeletedAncestors(parent);
    }

    @Transactional
    public SubmissionCommentResponse updateComment(
            Long studyId,
            Long submissionId,
            Long commentId,
            Long requesterId,
            SubmissionCommentUpdateRequest request) {
        validateStudyMember(studyId, requesterId);
        getSubmissionInStudy(studyId, submissionId);

        SubmissionComment target = submissionCommentRepository.findByIdAndSubmission_Id(commentId, submissionId)
                .orElseThrow(() -> new BusinessException(ErrorCode.INVALID_INPUT_VALUE));

        if (!target.getUser().getId().equals(requesterId)) {
            throw new BusinessException(ErrorCode.ACCESS_DENIED);
        }
        if (Boolean.TRUE.equals(target.getIsDeleted())) {
            throw new BusinessException(ErrorCode.INVALID_INPUT_VALUE);
        }

        String content = request.getContent() == null ? "" : request.getContent().trim();
        if (content.isEmpty()) {
            throw new BusinessException(ErrorCode.INVALID_INPUT_VALUE);
        }

        target.updateContent(content);
        return SubmissionCommentResponse.from(target);
    }

    private void validateStudyMember(Long studyId, Long userId) {
        StudyRoom studyRef = StudyRoom.builder().id(studyId).build();
        boolean isMember = studyMemberRepository.existsByStudyAndUser_Id(studyRef, userId);
        if (!isMember) {
            throw new BusinessException(ErrorCode.ACCESS_DENIED);
        }
    }

    private SubmissionCommentType resolveCommentType(String typeRaw, SubmissionComment parent) {
        if (typeRaw == null || typeRaw.isBlank()) {
            return parent != null ? parent.getCommentType() : SubmissionCommentType.INLINE;
        }

        try {
            return SubmissionCommentType.valueOf(typeRaw.trim().toUpperCase());
        } catch (IllegalArgumentException ignored) {
            throw new BusinessException(ErrorCode.INVALID_INPUT_VALUE);
        }
    }

    private SubmissionLog getSubmissionInStudy(Long studyId, Long submissionId) {
        SubmissionLog submission = submissionLogRepository.findById(submissionId)
                .orElseThrow(() -> new BusinessException(ErrorCode.SUBMISSION_NOT_FOUND));

        if (submission.getRoomId() == null || !submission.getRoomId().equals(studyId)) {
            throw new BusinessException(ErrorCode.ACCESS_DENIED);
        }
        return submission;
    }

    private void cleanupDeletedAncestors(SubmissionComment parent) {
        SubmissionComment cursor = parent;
        while (cursor != null) {
            boolean hasChildren = submissionCommentRepository.existsByParent_Id(cursor.getId());
            if (Boolean.TRUE.equals(cursor.getIsDeleted()) && !hasChildren) {
                SubmissionComment next = cursor.getParent();
                submissionCommentRepository.delete(cursor);
                cursor = next;
                continue;
            }
            break;
        }
    }

    private void validateLineRange(Integer lineStart, Integer lineEnd, int maxLine) {
        boolean invalidBounds = lineStart < 1 || lineEnd < lineStart || lineStart > maxLine || lineEnd > maxLine;
        if (invalidBounds) {
            throw new BusinessException(ErrorCode.INVALID_INPUT_VALUE);
        }
    }

    private int countCodeLines(String code) {
        if (code == null || code.isEmpty()) {
            return 1;
        }
        return code.split("\\R", -1).length;
    }
}
