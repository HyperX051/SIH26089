package com.sih.gig.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class OcrReceiptRequest {
    @NotBlank(message = "booking_id is required")
    private String bookingId;

    @NotBlank(message = "receipt_image_url is required")
    private String receiptImageUrl;
}
