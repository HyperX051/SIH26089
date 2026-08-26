package com.sih.gig.controller;

import com.sih.gig.entity.User;
import com.sih.gig.entity.Worker;
import com.sih.gig.dto.request.VerifyNcctRequest;
import com.sih.gig.repository.UserRepository;
import com.sih.gig.repository.WorkerRepository;
import com.sih.gig.service.FileStorageService;
import com.sih.gig.service.AiService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.Map;
import java.util.Optional;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;
    private final WorkerRepository workerRepository;
    private final FileStorageService fileStorageService;
    private final AiService aiService;

    @PostMapping("/complete-profile")
    public ResponseEntity<?> completeProfile(
            @AuthenticationPrincipal User user,
            @RequestParam("name") String name,
            @RequestParam(value = "photo", required = false) MultipartFile photo,
            @RequestParam(value = "certificate", required = false) MultipartFile certificate) {

        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        }

        user.setName(name);
        userRepository.save(user);

        if ("WORKER".equalsIgnoreCase(user.getRole())) {
            Optional<Worker> optionalWorker = workerRepository.findByUserId(user.getId());
            if (optionalWorker.isPresent()) {
                Worker worker = optionalWorker.get();
                boolean workerUpdated = false;
                if (photo != null && !photo.isEmpty()) {
                    String photoUrl = fileStorageService.storeFile(photo);
                    worker.setPhotoUrl(photoUrl);
                    workerUpdated = true;
                }
                if (certificate != null && !certificate.isEmpty()) {
                    String certUrl = fileStorageService.storeFile(certificate);
                    worker.setCertificationUrl(certUrl);
                    
                    // Trigger AI OCR Verification
                    Map<String, Object> aiResult = aiService.verifyCredential(
                        new VerifyNcctRequest(String.valueOf(worker.getId()), certUrl)
                    );
                    
                    if (Boolean.TRUE.equals(aiResult.get("verified"))) {
                        worker.setItiCertified(true);
                        worker.setTier((String) aiResult.getOrDefault("recommended_tier", "SKILLED"));
                        worker.setApprovalStatus("APPROVED");
                    } else {
                        worker.setApprovalStatus("PENDING");
                    }
                    workerUpdated = true;
                }
                if (workerUpdated) {
                    workerRepository.save(worker);
                }
            }
        }

        return ResponseEntity.ok(Map.of("message", "Profile completed successfully", "user", user));
    }

    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(
            @AuthenticationPrincipal User user,
            @RequestBody Map<String, String> body) {
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        }
        
        if (body.containsKey("name")) {
            user.setName(body.get("name"));
        }
        if (body.containsKey("phone")) {
            user.setPhone(body.get("phone"));
        }
        userRepository.save(user);
        return ResponseEntity.ok(Map.of("message", "Profile updated", "user", user));
    }

    @DeleteMapping("/profile")
    public ResponseEntity<?> deleteProfile(@AuthenticationPrincipal User user) {
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        }
        try {
            if ("WORKER".equalsIgnoreCase(user.getRole())) {
                workerRepository.findByUserId(user.getId()).ifPresent(workerRepository::delete);
            }
            userRepository.delete(user);
            return ResponseEntity.ok(Map.of("message", "Account deleted successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Cannot delete account due to associated records. Please contact support."));
        }
    }
}

