package com.sih.gig.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public class ApiException extends RuntimeException {

    private final String code;
    private final HttpStatus httpStatus;

    public ApiException(String code, String message, HttpStatus httpStatus) {
        super(message);
        this.code = code;
        this.httpStatus = httpStatus;
    }

    public static ApiException notFound(String message) {
        return new ApiException("RESOURCE_NOT_FOUND", message, HttpStatus.NOT_FOUND);
    }

    public static ApiException badRequest(String message) {
        return new ApiException("BAD_REQUEST", message, HttpStatus.BAD_REQUEST);
    }

    public static ApiException unauthorized(String message) {
        return new ApiException("UNAUTHORIZED", message, HttpStatus.UNAUTHORIZED);
    }

    public static ApiException forbidden(String message) {
        return new ApiException("FORBIDDEN", message, HttpStatus.FORBIDDEN);
    }

    public static ApiException conflict(String message) {
        return new ApiException("CONFLICT", message, HttpStatus.CONFLICT);
    }
}
