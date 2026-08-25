package com.sih.gig.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class SendOtpRequest {

    @NotBlank(message = "Phone number is required")
    @Pattern(regexp = "\\+91[6-9]\\d{9}", message = "Invalid Indian phone number (e.g. +919876543210)")
    private String phone;

    @NotBlank(message = "Role is required")
    @Pattern(regexp = "CUSTOMER|WORKER|ADMIN", message = "Role must be CUSTOMER, WORKER, or ADMIN")
    private String role;
}
