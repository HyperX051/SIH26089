package com.sih.gig.dto.request;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class UpdateRadiusRequest {

    @NotNull(message = "service_radius_km is required")
    @DecimalMin(value = "1.0", message = "Minimum radius is 1 km")
    @DecimalMax(value = "50.0", message = "Maximum radius is 50 km")
    private BigDecimal serviceRadiusKm;
}
