package com.peekle.domain.study.dto.ide;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.ToString;

@Getter
@NoArgsConstructor
@ToString
public class IdeRequest {
    private String filename; // e.g. "Main.java"
    private String code; // Source code content
    private String lang; // e.g. "java", "python"

    public IdeRequest(String filename, String code, String lang) {
        this.filename = filename;
        this.code = code;
        this.lang = lang;
    }
}
