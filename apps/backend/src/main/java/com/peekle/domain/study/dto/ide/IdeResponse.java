package com.peekle.domain.study.dto.ide;

import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class IdeResponse {
    private Long senderId;
    private String senderName;
    private Long problemId;
    private String filename;
    private String code;
    private String lang;

    @Builder
    public IdeResponse(Long senderId, String senderName, Long problemId, String filename, String code, String lang) {
        this.senderId = senderId;
        this.senderName = senderName;
        this.problemId = problemId;
        this.filename = filename;
        this.code = code;
        this.lang = lang;
    }
}
