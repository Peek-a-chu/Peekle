package com.peekle.global.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponse<T> {
    private final boolean success;
    private final T data;
    private final ErrorDetail error;

    @Getter
    @AllArgsConstructor
    public static class ErrorDetail {
        private final String code;
        private final String message;
    }

    // Success responses
    public static <T> ApiResponse<T> success(T data) {
        return new ApiResponse<>(true, data, null);
    }

    public static ApiResponse<Void> success() {
        return new ApiResponse<>(true, null, null);
    }

    // Error responses
    public static <T> ApiResponse<T> error(String code, String message) {
        return new ApiResponse<>(false, null, new ErrorDetail(code, message));
    }
}
