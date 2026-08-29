package com.sih.gig.dto.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class OcrReceiptRequest {
    @JsonProperty("booking_id")
    @NotBlank(message = "booking_id is required")
    private String bookingId;

    @JsonProperty("receipt_image_url")
    @NotBlank(message = "receipt_image_url is required")
    private String receiptImageUrl;
}
