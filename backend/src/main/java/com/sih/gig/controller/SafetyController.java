package com.sih.gig.controller;

import com.sih.gig.dto.request.SosRequest;
import com.sih.gig.dto.response.ApiResponse;
import com.sih.gig.entity.User;
import com.sih.gig.service.SafetyService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/safety")
@RequiredArgsConstructor
public class SafetyController {

    private final SafetyService safetyService;

    /** POST /api/v1/safety/sos */
    @PostMapping("/sos")
    public ResponseEntity<ApiResponse<?>> triggerSos(
            @Valid @RequestBody SosRequest req,
            Authentication auth) {
        User currentUser = (User) auth.getPrincipal();
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.ok(safetyService.triggerSos(currentUser, req)));
    }
}
