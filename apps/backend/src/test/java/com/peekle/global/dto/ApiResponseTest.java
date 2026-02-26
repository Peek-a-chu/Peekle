package com.peekle.global.dto;

import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;

class ApiResponseTest {

    @Test
    void success_with_data() {
        ApiResponse<String> response = ApiResponse.success("test");
        assertThat(response.isSuccess()).isTrue();
        assertThat(response.getData()).isEqualTo("test");
        assertThat(response.getError()).isNull();
    }

    @Test
    void success_void() {
        ApiResponse<Void> response = ApiResponse.success();
        assertThat(response.isSuccess()).isTrue();
        assertThat(response.getData()).isNull();
        assertThat(response.getError()).isNull();
    }

    @Test
    void error() {
        ApiResponse<String> response = ApiResponse.error("CODE", "message");
        assertThat(response.isSuccess()).isFalse();
        assertThat(response.getData()).isNull();
        assertThat(response.getError()).isNotNull();
        assertThat(response.getError().getCode()).isEqualTo("CODE");
        assertThat(response.getError().getMessage()).isEqualTo("message");
    }
}
