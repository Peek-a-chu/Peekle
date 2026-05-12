package com.peekle.domain.problem.repository;

import com.peekle.domain.problem.entity.TagMapping;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface TagMappingRepository extends JpaRepository<TagMapping, Long> {
    Optional<TagMapping> findBySourceAndExternalKey(String source, String externalKey);

    List<TagMapping> findBySourceAndExternalKeyIn(String source, Collection<String> externalKeys);
}
