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
    private String problemTitle;
    private String externalId;
    private String filename;
    private String code;
    private String lang;
    private Long eventTs;

    @Builder
    public IdeResponse(
            Long senderId,
            String senderName,
            Long problemId,
            String problemTitle,
            String externalId,
            String filename,
            String code,
            String lang,
            Long eventTs) {
        this.senderId = senderId;
        this.senderName = senderName;
        this.problemId = problemId;
        this.problemTitle = problemTitle;
        this.externalId = externalId;
        this.filename = filename;
        this.code = code;
        this.lang = lang;
        this.eventTs = eventTs;
    }
}
