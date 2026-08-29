package com.sih.gig.dto.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class UpdateAvailabilityRequest {

    @JsonProperty("is_available")
    @NotNull(message = "is_available is required")
    private Boolean isAvailable;

    // Optional: current location for geo-updates
    private Double latitude;
    private Double longitude;
}
