package com.sih.gig.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class VerifyRepairRequest {
    @NotBlank(message = "booking_id is required")
    private String bookingId;

    @NotBlank(message = "before_image_url is required")
    private String beforeImageUrl;

    @NotBlank(message = "after_image_url is required")
    private String afterImageUrl;
}
