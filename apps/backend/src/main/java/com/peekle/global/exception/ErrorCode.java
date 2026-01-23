package com.peekle.global.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum ErrorCode {
    // Common
    INTERNAL_SERVER_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "COMMON_001", "서버 내부 오류가 발생했습니다."),
    INVALID_INPUT_VALUE(HttpStatus.BAD_REQUEST, "COMMON_002", "입력값이 올바르지 않습니다."),
    METHOD_NOT_ALLOWED(HttpStatus.METHOD_NOT_ALLOWED, "COMMON_003", "허용되지 않은 HTTP 메서드입니다."),

    // User
    USER_NOT_FOUND(HttpStatus.NOT_FOUND, "USER_001", "사용자를 찾을 수 없습니다."),
    DUPLICATE_NICKNAME(HttpStatus.CONFLICT, "USER_002", "이미 사용 중인 닉네임입니다."),

    // Auth
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "AUTH_001", "인증이 필요합니다."),
    INVALID_TOKEN(HttpStatus.UNAUTHORIZED, "AUTH_002", "유효하지 않은 토큰입니다."),
    EXPIRED_TOKEN(HttpStatus.UNAUTHORIZED, "AUTH_003", "만료된 토큰입니다."),

    // Study
    STUDY_ROOM_NOT_FOUND(HttpStatus.NOT_FOUND, "STUDY_001", "스터디 방을 찾을 수 없습니다."),
    ALREADY_JOINED_STUDY(HttpStatus.CONFLICT, "STUDY_002", "이미 가입된 스터디입니다."),
    INVALID_INVITE_CODE(HttpStatus.BAD_REQUEST, "STUDY_003", "유효하지 않거나 만료된 초대 코드입니다."),

    // Submission
    BAEKJOON_SUBMISSION_NOT_FOUND(HttpStatus.BAD_REQUEST, "SUBMISSION_001", "백준 제출 기록을 찾을 수 없습니다."),
    INVALID_SUBMISSION_STATUS(HttpStatus.BAD_REQUEST, "SUBMISSION_002", "성공한 제출이 아닙니다."),
    CODE_LENGTH_MISMATCH(HttpStatus.BAD_REQUEST, "SUBMISSION_003", "코드 길이가 일치하지 않습니다."),
    BAEKJOON_CONNECTION_ERROR(HttpStatus.SERVICE_UNAVAILABLE, "SUBMISSION_004", "백준 사이트 접속에 실패했습니다."),
    USER_VERIFICATION_FAILED(HttpStatus.UNAUTHORIZED, "SUBMISSION_005", "사용자 검증에 실패했습니다.");

    private final HttpStatus status;
    private final String code;
    private final String message;
}
