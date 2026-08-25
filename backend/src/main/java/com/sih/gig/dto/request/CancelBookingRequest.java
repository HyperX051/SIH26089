package com.sih.gig.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class CancelBookingRequest {
    @NotBlank(message = "reason is required")
    private String reason;

    @NotBlank
    @Pattern(regexp = "CUSTOMER|WORKER|ADMIN", message = "cancelled_by must be CUSTOMER, WORKER, or ADMIN")
    private String cancelledBy;
}
