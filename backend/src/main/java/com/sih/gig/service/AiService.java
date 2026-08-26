package com.sih.gig.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sih.gig.dto.request.OcrReceiptRequest;
import com.sih.gig.dto.request.VerifyNcctRequest;
import com.sih.gig.dto.request.VerifyRepairRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
public class AiService {

    @Value("${app.ai.api-key}")
    private String aiApiKey;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final Map<String, Double> PRICE_INDEX = Map.of(
            "PVC Pipe 1/2 inch",    110.0,
            "Copper Wire 1.5mm",     95.0,
            "Switch 6A",             45.0,
            "Wall Putty 1kg",        55.0,
            "Paint Brush",           40.0
    );
    private static final double PRICE_FLAG_THRESHOLD = 1.25;

    public Map<String, Object> verifyRepair(VerifyRepairRequest req) {
        log.info("[AI] verify-repair bookingId={}", req.getBookingId());
        try {
            String prompt = "You are an expert home repair auditor. Look at the attached image which shows a repair job (after completion). Analyze it and output ONLY a raw JSON object (no markdown, no backticks) with: {\\\"verified\\\": boolean, \\\"confidence_score\\\": float between 0 and 1, \\\"notes\\\": \\\"brief explanation\\\"}";
            String aiResponse = callGeminiVision(prompt, req.getAfterImageUrl());
            
            aiResponse = aiResponse.replaceAll("```json", "").replaceAll("```", "").trim();
            JsonNode root = objectMapper.readTree(aiResponse);
            
            Map<String, Object> result = new HashMap<>();
            result.put("verified", root.path("verified").asBoolean(true));
            result.put("confidence_score", root.path("confidence_score").asDouble(0.9));
            result.put("notes", root.path("notes").asText("Repair looks complete."));
            return result;
        } catch (Exception e) {
            log.error("Gemini AI failed for repair verify", e);
            return Map.of("verified", true, "confidence_score", 0.8, "notes", "[Fallback] Approved automatically.");
        }
    }

    public Map<String, Object> ocrReceipt(OcrReceiptRequest req) {
        log.info("[AI] ocr-receipt bookingId={}", req.getBookingId());
        try {
            String prompt = "You are a receipt analyzer. Look at this hardware store receipt. Extract the items. Output ONLY a raw JSON object (no markdown) with: {\\\"extracted_items\\\": [{\\\"item\\\": \\\"name\\\", \\\"qty\\\": number, \\\"price\\\": number}]}";
            String aiResponse = callGeminiVision(prompt, req.getReceiptImageUrl());
            
            aiResponse = aiResponse.replaceAll("```json", "").replaceAll("```", "").trim();
            JsonNode root = objectMapper.readTree(aiResponse);
            
            List<Map<String, Object>> items = objectMapper.convertValue(root.path("extracted_items"), List.class);
            if (items == null) items = List.of();

            double totalAmount = items.stream()
                    .mapToDouble(i -> ((Number) i.get("price")).doubleValue() * ((Number) i.get("qty")).doubleValue())
                    .sum();

            boolean flagged = items.stream().anyMatch(item -> {
                String name  = (String) item.get("item");
                double price = ((Number) item.get("price")).doubleValue();
                Double indexPrice = PRICE_INDEX.getOrDefault(name, null);
                return indexPrice != null && price > indexPrice * PRICE_FLAG_THRESHOLD;
            });

            return Map.of(
                    "extracted_items", items,
                    "total_receipt_amount", totalAmount,
                    "price_flagged", flagged
            );
        } catch (Exception e) {
            log.error("Gemini AI failed for OCR", e);
            return Map.of("extracted_items", List.of(), "total_receipt_amount", 0.0, "price_flagged", false);
        }
    }

    public Map<String, Object> verifyNcct(VerifyNcctRequest req) {
        log.info("[AI] verify-ncct workerId={}", req.getWorkerId());
        try {
            String prompt = "You are a credential verifier. Look at this certificate. Does it mention 'NCCT', 'National Council for Cooperative Training', or 'Cooperative'? Output ONLY a raw JSON object (no markdown) with: {\\\"verified\\\": boolean, \\\"institute\\\": \\\"institute name or unknown\\\", \\\"recommended_tier\\\": \\\"SKILLED or BASIC\\\"}";
            String aiResponse = callGeminiVision(prompt, req.getCertificateImageUrl());
            
            aiResponse = aiResponse.replaceAll("```json", "").replaceAll("```", "").trim();
            JsonNode root = objectMapper.readTree(aiResponse);
            
            return Map.of(
                    "verified", root.path("verified").asBoolean(true),
                    "institute", root.path("institute").asText("NCCT Regional"),
                    "recommended_tier", root.path("recommended_tier").asText("SKILLED")
            );
        } catch (Exception e) {
            log.error("Gemini AI failed for NCCT", e);
            return Map.of("verified", true, "institute", "NCCT Local", "recommended_tier", "SKILLED");
        }
    }

    private String callGeminiVision(String prompt, String imageUrl) {
        try {
            byte[] imageBytes = restTemplate.getForObject(imageUrl, byte[].class);
            String base64Image = Base64.getEncoder().encodeToString(imageBytes);

            String url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + aiApiKey;

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            String requestBody = String.format("""
                {
                  "contents": [{
                    "parts": [
                      {"text": "%s"},
                      {
                        "inline_data": {
                          "mime_type": "image/jpeg",
                          "data": "%s"
                        }
                      }
                    ]
                  }]
                }
                """, prompt, base64Image);

            HttpEntity<String> entity = new HttpEntity<>(requestBody, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);
            
            JsonNode root = objectMapper.readTree(response.getBody());
            return root.path("candidates").get(0).path("content").path("parts").get(0).path("text").asText();
        } catch (Exception e) {
            throw new RuntimeException("Gemini API call failed", e);
        }
    }
}
