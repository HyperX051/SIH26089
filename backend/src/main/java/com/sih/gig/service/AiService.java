package com.sih.gig.service;

import com.sih.gig.dto.request.OcrReceiptRequest;
import com.sih.gig.dto.request.VerifyNcctRequest;
import com.sih.gig.dto.request.VerifyRepairRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

/**
 * AI Verification Service
 *
 * All methods are currently STUBBED with realistic responses.
 * TODO: Replace stub implementations with real API calls:
 *   - Repair Audit   → Google Gemini Vision API (compare before/after images)
 *   - Receipt OCR    → Google Cloud Vision / Gemini Vision API
 *   - NCCT RAG       → Embedding + vector store lookup (e.g. Supabase pgvector)
 */
@Service
@Slf4j
public class AiService {

    @Value("${app.ai.api-key}")
    private String aiApiKey;

    // Stub price index (₹ per unit) for flagging inflated receipt items
    private static final Map<String, Double> PRICE_INDEX = Map.of(
            "PVC Pipe 1/2 inch",    110.0,
            "Copper Wire 1.5mm",     95.0,
            "Switch 6A",             45.0,
            "Wall Putty 1kg",        55.0,
            "Paint Brush",           40.0
    );

    private static final double PRICE_FLAG_THRESHOLD = 1.25; // 25% over index

    /**
     * POST /api/v1/ai/verify-repair
     * Compares before/after images to audit repair quality.
     */
    public Map<String, Object> verifyRepair(VerifyRepairRequest req) {
        log.info("[AI] verify-repair bookingId={} before={} after={}",
                req.getBookingId(), req.getBeforeImageUrl(), req.getAfterImageUrl());

        // TODO: Call Gemini Vision API:
        // POST https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent
        // with both image URLs and a prompt like:
        // "Compare the before and after images of a repair job. Was the repair completed successfully?
        //  Report: verified (bool), confidence_score (0-1), notes (string)."

        // STUB response:
        return Map.of(
                "verified",          true,
                "confidence_score",  0.94,
                "notes",             "[STUB] Repair appears complete. Pipe replaced and sealed correctly."
        );
    }

    /**
     * POST /api/v1/ai/ocr-receipt
     * Extracts line items from hardware receipt image, flags items >25% above price index.
     */
    public Map<String, Object> ocrReceipt(OcrReceiptRequest req) {
        log.info("[AI] ocr-receipt bookingId={} receipt={}", req.getBookingId(), req.getReceiptImageUrl());

        // TODO: Call Vision OCR API to extract line items, then compare against PRICE_INDEX.

        // STUB extracted items:
        List<Map<String, Object>> items = List.of(
                Map.of("item", "PVC Pipe 1/2 inch", "qty", 1, "price", 120.00)
        );

        double totalAmount = items.stream()
                .mapToDouble(i -> ((Number) i.get("price")).doubleValue() * ((Number) i.get("qty")).doubleValue())
                .sum();

        // Price guard check
        boolean flagged = items.stream().anyMatch(item -> {
            String name  = (String) item.get("item");
            double price = ((Number) item.get("price")).doubleValue();
            Double indexPrice = PRICE_INDEX.get(name);
            return indexPrice != null && price > indexPrice * PRICE_FLAG_THRESHOLD;
        });

        return Map.of(
                "extracted_items",      items,
                "total_receipt_amount", totalAmount,
                "price_flagged",        flagged
        );
    }

    /**
     * POST /api/v1/ai/verify-ncct
     * Validates NCCT certificate text against authorized institute database (RAG).
     */
    public Map<String, Object> verifyNcct(VerifyNcctRequest req) {
        log.info("[AI] verify-ncct workerId={} cert={}", req.getWorkerId(), req.getCertificateImageUrl());

        // TODO: OCR the certificate image, embed the text, and query Supabase pgvector
        // to find the closest matching NCCT institute. If cosine similarity > 0.85 → verified.

        // STUB response:
        return Map.of(
                "verified",           true,
                "institute",          "[STUB] NCCT Regional Institute, Chennai",
                "recommended_tier",   "SKILLED"
        );
    }
}
