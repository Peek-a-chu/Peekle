package com.peekle.domain.workbook.repository;

import com.peekle.domain.user.entity.User;
import com.peekle.domain.workbook.entity.Workbook;
import com.peekle.domain.workbook.entity.WorkbookBookmark;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface WorkbookBookmarkRepository extends JpaRepository<WorkbookBookmark, Long> {

    Optional<WorkbookBookmark> findByWorkbookAndUser(Workbook workbook, User user);

    boolean existsByWorkbookAndUser(Workbook workbook, User user);

    void deleteByWorkbookAndUser(Workbook workbook, User user);
}
