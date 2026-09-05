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

import java.nio.file.Path;
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
            return Map.of("verified", false, "confidence_score", 0.0, "notes", "[Error] AI Audit Failed. Please ensure API Key is valid or image is clear.");
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

    public Map<String, Object> verifyCredential(VerifyNcctRequest req) {
        log.info("[AI] verify-credential workerId={}", req.getWorkerId());
        try {
            String prompt = "You are a credential verifier. Look at this uploaded document. It could be an Aadhar Card, an ITI Certificate, an NSQF certificate, a driver's license, or any trade certification. Determine if it is a valid identification or trade credential. Output ONLY a raw JSON object (no markdown) with: {\"verified\": boolean, \"institute_or_issuer\": \"Issuer name or unknown\", \"recommended_tier\": \"SKILLED or BASIC\"}";
            String aiResponse = callGeminiVision(prompt, req.getCertificateImageUrl());
            
            aiResponse = aiResponse.replaceAll("```json", "").replaceAll("```", "").trim();
            JsonNode root = objectMapper.readTree(aiResponse);
            
            return Map.of(
                    "verified", root.path("verified").asBoolean(true),
                    "institute_or_issuer", root.path("institute_or_issuer").asText("Govt / Generic Issuer"),
                    "recommended_tier", root.path("recommended_tier").asText("SKILLED")
            );
        } catch (Exception e) {
            log.error("Gemini AI failed for Credential verification", e);
            return Map.of("verified", false, "institute_or_issuer", "Unknown", "recommended_tier", "BASIC");
        }
    }

    public Map<String, Object> assessProblem(String problemDescription) {
        log.info("[AI] assess-problem prompt={}", problemDescription);
        try {
            String prompt = "You are an expert service assessor for a gig platform. A customer has requested: '" + problemDescription + "'. Assess this request. Output ONLY a raw JSON object (no markdown) with: {\"urgency\": \"Low|Medium|High|Critical\", \"estimated_cost_range\": \"e.g. ₹500 - ₹1200\", \"recommended_tools\": [\"tool1\", \"tool2\"]}";
            
            // Reusing callGeminiVision by passing a dummy 1x1 transparent pixel or we can just make a text-only call.
            // Since callGeminiVision requires an image URL, we'll construct a text-only payload instead for this specific method.
            String url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + aiApiKey;
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            
            String requestBody = String.format("""
                {
                  "contents": [{
                    "parts": [{"text": "%s"}]
                  }]
                }
                """, prompt.replace("\"", "\\\"").replace("\n", " "));

            HttpEntity<String> entity = new HttpEntity<>(requestBody, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);
            
            JsonNode root = objectMapper.readTree(response.getBody());
            String aiResponse = root.path("candidates").get(0).path("content").path("parts").get(0).path("text").asText();
            aiResponse = aiResponse.replaceAll("```json", "").replaceAll("```", "").trim();
            JsonNode resultRoot = objectMapper.readTree(aiResponse);
            
            return Map.of(
                    "urgency", resultRoot.path("urgency").asText("Medium"),
                    "estimated_cost_range", resultRoot.path("estimated_cost_range").asText("₹300 - ₹800"),
                    "recommended_tools", objectMapper.convertValue(resultRoot.path("recommended_tools"), List.class)
            );
        } catch (Exception e) {
            log.error("Gemini AI failed for problem assessment", e);
            return Map.of("urgency", "Unknown", "estimated_cost_range", "Variable", "recommended_tools", List.of("Standard Kit"));
        }
    }

    private String callGeminiVision(String prompt, String imageUrl) {
        try {
            byte[] imageBytes;
            if (imageUrl.startsWith("/uploads/")) {
                // Local file served by our own backend
                Path filePath = java.nio.file.Paths.get("uploads", imageUrl.substring(9));
                imageBytes = java.nio.file.Files.readAllBytes(filePath);
            } else if (imageUrl.startsWith("http://localhost") || imageUrl.startsWith("http://127.0.0.1")) {
                // Full localhost URL — strip to local path
                String path = java.net.URI.create(imageUrl).getPath();
                if (path.startsWith("/uploads/")) {
                    Path filePath = java.nio.file.Paths.get("uploads", path.substring(9));
                    imageBytes = java.nio.file.Files.readAllBytes(filePath);
                } else {
                    imageBytes = restTemplate.getForObject(imageUrl, byte[].class);
                }
            } else {
                imageBytes = restTemplate.getForObject(imageUrl, byte[].class);
            }

            if (imageBytes == null || imageBytes.length == 0) {
                throw new RuntimeException("Image bytes were empty for URL: " + imageUrl);
            }

            String base64Image = Base64.getEncoder().encodeToString(imageBytes);
            String mimeType = imageUrl.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";

            String apiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + aiApiKey;

            // Use ObjectMapper to safely construct request body (avoids manual escaping bugs)
            Map<String, Object> textPart = Map.of("text", prompt);
            Map<String, Object> inlineData = Map.of("mime_type", mimeType, "data", base64Image);
            Map<String, Object> imagePart = Map.of("inline_data", inlineData);
            Map<String, Object> content = Map.of("parts", List.of(textPart, imagePart));
            Map<String, Object> requestBody = Map.of("contents", List.of(content));

            String requestJson = objectMapper.writeValueAsString(requestBody);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<String> entity = new HttpEntity<>(requestJson, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(apiUrl, entity, String.class);

            JsonNode root = objectMapper.readTree(response.getBody());
            return root.path("candidates").get(0).path("content").path("parts").get(0).path("text").asText();
        } catch (Exception e) {
            log.error("Gemini API call failed for imageUrl={}: {}", imageUrl, e.getMessage());
            throw new RuntimeException("Gemini API call failed: " + e.getMessage(), e);
        }
    }
}
