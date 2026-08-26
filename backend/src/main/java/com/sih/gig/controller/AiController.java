package com.sih.gig.controller;

import com.sih.gig.dto.request.OcrReceiptRequest;
import com.sih.gig.dto.request.VerifyNcctRequest;
import com.sih.gig.dto.request.VerifyRepairRequest;
import com.sih.gig.dto.response.ApiResponse;
import com.sih.gig.service.AiService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/ai")
@RequiredArgsConstructor
public class AiController {

    private final AiService aiService;

    /** POST /api/v1/ai/verify-repair */
    @PostMapping("/verify-repair")
    public ResponseEntity<ApiResponse<?>> verifyRepair(@Valid @RequestBody VerifyRepairRequest req) {
        return ResponseEntity.ok(ApiResponse.ok(aiService.verifyRepair(req)));
    }

    /** POST /api/v1/ai/ocr-receipt */
    @PostMapping("/ocr-receipt")
    public ResponseEntity<ApiResponse<?>> ocrReceipt(@Valid @RequestBody OcrReceiptRequest req) {
        return ResponseEntity.ok(ApiResponse.ok(aiService.ocrReceipt(req)));
    }

    /** POST /api/v1/ai/verify-credential */
    @PostMapping("/verify-credential")
    public ResponseEntity<ApiResponse<?>> verifyCredential(@Valid @RequestBody VerifyNcctRequest req) {
        return ResponseEntity.ok(ApiResponse.ok(aiService.verifyCredential(req)));
    }

    /** POST /api/v1/ai/assess-problem */
    @PostMapping("/assess-problem")
    public ResponseEntity<ApiResponse<?>> assessProblem(@RequestBody java.util.Map<String, String> payload) {
        String prompt = payload.getOrDefault("problemDescription", "");
        return ResponseEntity.ok(ApiResponse.ok(aiService.assessProblem(prompt)));
    }
}
