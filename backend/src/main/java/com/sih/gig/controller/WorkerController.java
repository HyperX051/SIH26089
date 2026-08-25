package com.sih.gig.controller;

import com.sih.gig.dto.request.UpdateAvailabilityRequest;
import com.sih.gig.dto.request.UpdateRadiusRequest;
import com.sih.gig.dto.response.ApiResponse;
import com.sih.gig.entity.User;
import com.sih.gig.service.WorkerService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/workers")
@RequiredArgsConstructor
public class WorkerController {

    private final WorkerService workerService;

    /** PATCH /api/v1/workers/profile/radius */
    @PatchMapping("/profile/radius")
    public ResponseEntity<ApiResponse<?>> updateRadius(
            @Valid @RequestBody UpdateRadiusRequest req,
            Authentication auth) {
        User currentUser = (User) auth.getPrincipal();
        return ResponseEntity.ok(ApiResponse.ok(workerService.updateRadius(currentUser, req)));
    }

    /** PATCH /api/v1/workers/profile/availability */
    @PatchMapping("/profile/availability")
    public ResponseEntity<ApiResponse<?>> updateAvailability(
            @Valid @RequestBody UpdateAvailabilityRequest req,
            Authentication auth) {
        User currentUser = (User) auth.getPrincipal();
        return ResponseEntity.ok(ApiResponse.ok(workerService.updateAvailability(currentUser, req)));
    }
}
