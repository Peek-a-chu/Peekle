package com.peekle.domain.submission.repository;

import com.peekle.domain.submission.entity.SubmissionComment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface SubmissionCommentRepository extends JpaRepository<SubmissionComment, Long> {

    @Query("""
            SELECT comment
            FROM SubmissionComment comment
            JOIN FETCH comment.user
            WHERE comment.submission.id = :submissionId
            ORDER BY comment.createdAt ASC, comment.id ASC
            """)
    List<SubmissionComment> findAllBySubmissionIdWithUser(@Param("submissionId") Long submissionId);

    Optional<SubmissionComment> findByIdAndSubmission_Id(Long id, Long submissionId);

    boolean existsByParent_Id(Long parentId);
}
