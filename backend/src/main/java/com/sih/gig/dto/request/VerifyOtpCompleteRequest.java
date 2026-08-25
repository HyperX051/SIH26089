package com.sih.gig.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class VerifyOtpCompleteRequest {

    @NotBlank(message = "entered_otp is required")
    @Pattern(regexp = "\\d{6}", message = "OTP must be 6 digits")
    private String enteredOtp;
}
