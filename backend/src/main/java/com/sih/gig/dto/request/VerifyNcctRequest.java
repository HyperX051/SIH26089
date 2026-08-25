package com.sih.gig.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class VerifyNcctRequest {
    @NotBlank(message = "worker_id is required")
    private String workerId;

    @NotBlank(message = "certificate_image_url is required")
    private String certificateImageUrl;
}
