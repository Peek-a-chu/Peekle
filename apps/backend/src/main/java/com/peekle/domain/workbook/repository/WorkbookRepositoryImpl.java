package com.peekle.domain.workbook.repository;

import com.peekle.domain.workbook.entity.Workbook;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.TypedQuery;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.util.List;

public class WorkbookRepositoryImpl implements WorkbookRepositoryCustom {

    @PersistenceContext
    private EntityManager em;

    @Override
    public Page<Workbook> findAllActive(String keyword, String sort, Pageable pageable) {
        String baseQuery = "SELECT w FROM Workbook w WHERE w.isActive = true";
        String countQuery = "SELECT COUNT(w) FROM Workbook w WHERE w.isActive = true";

        if (keyword != null && !keyword.isBlank()) {
            baseQuery += " AND w.title LIKE :keyword";
            countQuery += " AND w.title LIKE :keyword";
        }

        baseQuery += getOrderByClause(sort);

        TypedQuery<Workbook> query = em.createQuery(baseQuery, Workbook.class);
        TypedQuery<Long> countQ = em.createQuery(countQuery, Long.class);

        if (keyword != null && !keyword.isBlank()) {
            query.setParameter("keyword", "%" + keyword + "%");
            countQ.setParameter("keyword", "%" + keyword + "%");
        }

        query.setFirstResult((int) pageable.getOffset());
        query.setMaxResults(pageable.getPageSize());

        List<Workbook> results = query.getResultList();
        Long total = countQ.getSingleResult();

        return new PageImpl<>(results, pageable, total);
    }

    @Override
    public Page<Workbook> findMyWorkbooks(Long userId, String keyword, String sort, Pageable pageable) {
        String baseQuery = "SELECT w FROM Workbook w WHERE w.isActive = true AND w.creator.id = :userId";
        String countQuery = "SELECT COUNT(w) FROM Workbook w WHERE w.isActive = true AND w.creator.id = :userId";

        if (keyword != null && !keyword.isBlank()) {
            baseQuery += " AND w.title LIKE :keyword";
            countQuery += " AND w.title LIKE :keyword";
        }

        baseQuery += getOrderByClause(sort);

        TypedQuery<Workbook> query = em.createQuery(baseQuery, Workbook.class);
        TypedQuery<Long> countQ = em.createQuery(countQuery, Long.class);

        query.setParameter("userId", userId);
        countQ.setParameter("userId", userId);

        if (keyword != null && !keyword.isBlank()) {
            query.setParameter("keyword", "%" + keyword + "%");
            countQ.setParameter("keyword", "%" + keyword + "%");
        }

        query.setFirstResult((int) pageable.getOffset());
        query.setMaxResults(pageable.getPageSize());

        List<Workbook> results = query.getResultList();
        Long total = countQ.getSingleResult();

        return new PageImpl<>(results, pageable, total);
    }

    @Override
    public Page<Workbook> findBookmarkedWorkbooks(Long userId, String keyword, String sort, Pageable pageable) {
        String baseQuery = "SELECT w FROM Workbook w JOIN WorkbookBookmark b ON b.workbook = w " +
                "WHERE w.isActive = true AND b.user.id = :userId";
        String countQuery = "SELECT COUNT(w) FROM Workbook w JOIN WorkbookBookmark b ON b.workbook = w " +
                "WHERE w.isActive = true AND b.user.id = :userId";

        if (keyword != null && !keyword.isBlank()) {
            baseQuery += " AND w.title LIKE :keyword";
            countQuery += " AND w.title LIKE :keyword";
        }

        baseQuery += getOrderByClause(sort);

        TypedQuery<Workbook> query = em.createQuery(baseQuery, Workbook.class);
        TypedQuery<Long> countQ = em.createQuery(countQuery, Long.class);

        query.setParameter("userId", userId);
        countQ.setParameter("userId", userId);

        if (keyword != null && !keyword.isBlank()) {
            query.setParameter("keyword", "%" + keyword + "%");
            countQ.setParameter("keyword", "%" + keyword + "%");
        }

        query.setFirstResult((int) pageable.getOffset());
        query.setMaxResults(pageable.getPageSize());

        List<Workbook> results = query.getResultList();
        Long total = countQ.getSingleResult();

        return new PageImpl<>(results, pageable, total);
    }

    private String getOrderByClause(String sort) {
        if (sort == null) {
            return " ORDER BY w.createdAt DESC";
        }

        return switch (sort.toUpperCase()) {
            case "OLDEST" -> " ORDER BY w.createdAt ASC";
            case "BOOKMARKS" -> " ORDER BY w.bookmarkCount DESC, w.createdAt DESC";
            case "PROBLEMS" -> " ORDER BY SIZE(w.problems) DESC, w.createdAt DESC";
            default -> " ORDER BY w.createdAt DESC"; // LATEST
        };
    }
}
