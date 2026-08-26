package com.sih.gig.dto.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class VerifyOtpRequest {

    @NotBlank(message = "Phone number is required")
    private String phone;

    @NotBlank(message = "OTP is required")
    private String otp;

    @NotBlank(message = "Session ID is required")
    @JsonProperty("session_id")
    private String sessionId;
}
