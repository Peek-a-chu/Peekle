package com.peekle.domain.cs.entity;

import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

import java.io.Serializable;

@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class CsPastExamBestScoreId implements Serializable {
    private Long user;
    private Short examYear;
    private Short examRound;
}
