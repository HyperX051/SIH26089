package com.sih.gig.controller;

import com.sih.gig.dto.request.SendOtpRequest;
import com.sih.gig.dto.request.VerifyOtpRequest;
import com.sih.gig.dto.response.ApiResponse;
import com.sih.gig.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.web.multipart.MultipartFile;
import com.sih.gig.entity.User;
import java.util.Map;

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

    /** POST /api/v1/auth/admin-login */
    @PostMapping("/admin-login")
    public ResponseEntity<ApiResponse<?>> adminLogin(@RequestBody Map<String, String> req) {
        return ResponseEntity.ok(ApiResponse.ok(authService.adminLogin(req.get("email"), req.get("password"))));
    }

    /** POST /api/v1/auth/complete-profile */
    @PostMapping(value = "/complete-profile", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<?>> completeProfile(
            @RequestParam("name") String name,
            @RequestParam(value = "photo", required = false) MultipartFile photo,
            Authentication auth) {
        User currentUser = (User) auth.getPrincipal();
        return ResponseEntity.ok(ApiResponse.ok(authService.completeProfile(currentUser, name, photo)));
    }
}
