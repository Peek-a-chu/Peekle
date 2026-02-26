package com.peekle.domain.workbook.repository;

import com.peekle.domain.workbook.entity.Workbook;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface WorkbookRepositoryCustom {

    Page<Workbook> findAllActive(String keyword, String sort, Pageable pageable);

    Page<Workbook> findMyWorkbooks(Long userId, String keyword, String sort, Pageable pageable);

    Page<Workbook> findBookmarkedWorkbooks(Long userId, String keyword, String sort, Pageable pageable);
}
