package com.sih.gig.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Getter;

import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;

/**
 * Standard API response envelope — matches API_CONTRACTS exactly:
 * { "success": true, "data": {}, "error": null, "timestamp": "..." }
 */
@Getter
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponse<T> {

    private final boolean success;
    private final T data;
    private final ErrorPayload error;
    private final String timestamp;

    private ApiResponse(boolean success, T data, ErrorPayload error) {
        this.success   = success;
        this.data      = data;
        this.error     = error;
        this.timestamp = OffsetDateTime.now().format(DateTimeFormatter.ISO_OFFSET_DATE_TIME);
    }

    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(true, data, null);
    }

    public static <Void> ApiResponse<Void> error(String code, String message) {
        return new ApiResponse<>(false, null, new ErrorPayload(code, message));
    }

    @Getter
    public static class ErrorPayload {
        private final String code;
        private final String message;

        public ErrorPayload(String code, String message) {
            this.code    = code;
            this.message = message;
        }
    }
}
