package com.sih.gig.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class UpdateAvailabilityRequest {

    @NotNull(message = "is_available is required")
    private Boolean isAvailable;

    // Optional: current location for geo-updates
    private Double latitude;
    private Double longitude;
}
