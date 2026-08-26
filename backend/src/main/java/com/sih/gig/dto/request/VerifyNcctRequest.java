package com.sih.gig.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class VerifyNcctRequest {
    @NotBlank(message = "worker_id is required")
    private String workerId;

    @NotBlank(message = "certificate_image_url is required")
    private String certificateImageUrl;
}
