package com.sih.gig.controller;

import com.sih.gig.entity.User;
import com.sih.gig.entity.Worker;
import com.sih.gig.repository.UserRepository;
import com.sih.gig.repository.WorkerRepository;
import com.sih.gig.service.FileStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;
    private final WorkerRepository workerRepository;
    private final FileStorageService fileStorageService;

    @PostMapping("/complete-profile")
    public ResponseEntity<?> completeProfile(
            @AuthenticationPrincipal User user,
            @RequestParam("name") String name,
            @RequestParam(value = "photo", required = false) MultipartFile photo) {

        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        }

        user.setName(name);
        userRepository.save(user);

        if ("WORKER".equalsIgnoreCase(user.getRole())) {
            Optional<Worker> optionalWorker = workerRepository.findByUserId(user.getId());
            if (optionalWorker.isPresent()) {
                Worker worker = optionalWorker.get();
                if (photo != null && !photo.isEmpty()) {
                    String photoUrl = fileStorageService.storeFile(photo);
                    worker.setPhotoUrl(photoUrl);
                    workerRepository.save(worker);
                }
            }
        }

        return ResponseEntity.ok(Map.of("message", "Profile completed successfully", "user", user));
    }
}
