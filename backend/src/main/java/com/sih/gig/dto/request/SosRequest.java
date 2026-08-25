package com.sih.gig.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.Map;

@Data
public class SosRequest {

    @NotBlank(message = "booking_id is required")
    private String bookingId;

    @NotNull(message = "latitude is required")
    private Double latitude;

    @NotNull(message = "longitude is required")
    private Double longitude;

    private Map<String, Object> telemetry;  // { "battery": 78 }
}
