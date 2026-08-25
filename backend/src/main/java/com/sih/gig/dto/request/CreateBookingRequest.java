package com.sih.gig.dto.request;

import jakarta.validation.constraints.*;
import lombok.Data;

import java.time.OffsetDateTime;

@Data
public class CreateBookingRequest {

    @NotBlank(message = "service_type is required")
    @Pattern(regexp = "PLUMBER|ELECTRICIAN|CARPENTER|PAINTER|OTHER",
             message = "service_type must be one of: PLUMBER, ELECTRICIAN, CARPENTER, PAINTER, OTHER")
    private String serviceType;

    @NotBlank(message = "category_type is required")
    @Pattern(regexp = "PREDEFINED|CUSTOM", message = "category_type must be PREDEFINED or CUSTOM")
    private String categoryType = "PREDEFINED";

    private String customPromptText;

    @NotBlank(message = "booking_type is required")
    @Pattern(regexp = "INSTANT|SCHEDULED", message = "booking_type must be INSTANT or SCHEDULED")
    private String bookingType = "INSTANT";

    private OffsetDateTime scheduledFor;

    @NotNull(message = "latitude is required")
    @DecimalMin(value = "6.5",  message = "latitude out of India bounds")
    @DecimalMax(value = "37.5", message = "latitude out of India bounds")
    private Double latitude;

    @NotNull(message = "longitude is required")
    @DecimalMin(value = "68.0",  message = "longitude out of India bounds")
    @DecimalMax(value = "97.5",  message = "longitude out of India bounds")
    private Double longitude;

    @NotBlank(message = "pincode is required")
    @Pattern(regexp = "\\d{6}", message = "pincode must be 6 digits")
    private String pincode;

    @NotBlank(message = "address_text is required")
    private String addressText;
}
