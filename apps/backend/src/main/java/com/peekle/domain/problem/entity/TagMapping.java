package com.peekle.domain.problem.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@NoArgsConstructor
@Table(
        name = "tag_mappings",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_tag_mappings_source_external_key",
                columnNames = { "source", "external_key" }
        )
)
public class TagMapping {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tag_id", nullable = false)
    private Tag tag;

    @Column(nullable = false, length = 50)
    private String source;

    @Column(name = "external_key", nullable = false)
    private String externalKey;

    @Column(name = "external_name")
    private String externalName;

    public TagMapping(Tag tag, String source, String externalKey, String externalName) {
        this.tag = tag;
        this.source = source;
        this.externalKey = externalKey;
        this.externalName = externalName;
    }
}
