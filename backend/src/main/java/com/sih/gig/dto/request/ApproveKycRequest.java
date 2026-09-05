package com.sih.gig.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ApproveKycRequest {
    @NotBlank
    private String tier;
}
