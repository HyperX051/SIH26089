package com.sih.gig.controller;

import com.sih.gig.dto.request.SendOtpRequest;
import com.sih.gig.dto.request.VerifyOtpRequest;
import com.sih.gig.dto.response.ApiResponse;
import com.sih.gig.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    /** POST /api/v1/auth/send-otp */
    @PostMapping("/send-otp")
    public ResponseEntity<ApiResponse<?>> sendOtp(@Valid @RequestBody SendOtpRequest req) {
        return ResponseEntity.ok(ApiResponse.ok(authService.sendOtp(req)));
    }

    /** POST /api/v1/auth/verify-otp */
    @PostMapping("/verify-otp")
    public ResponseEntity<ApiResponse<?>> verifyOtp(@Valid @RequestBody VerifyOtpRequest req) {
        return ResponseEntity.ok(ApiResponse.ok(authService.verifyOtp(req)));
    }
}
