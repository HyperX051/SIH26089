package com.sih.gig.controller;

import com.sih.gig.dto.request.LoginRequest;
import com.sih.gig.dto.request.RegisterRequest;
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

    /** POST /api/v1/auth/register */
    @PostMapping("/register")
    public ResponseEntity<ApiResponse<?>> register(@Valid @RequestBody RegisterRequest req) {
        return ResponseEntity.ok(ApiResponse.ok(authService.register(req)));
    }

    /** POST /api/v1/auth/login */
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<?>> login(@Valid @RequestBody LoginRequest req) {
        return ResponseEntity.ok(ApiResponse.ok(authService.login(req)));
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

    /** POST /api/v1/auth/parse-qr */
    @PostMapping(value = "/parse-qr", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<?>> parseQr(@RequestParam("qr") MultipartFile qrFile) {
        return ResponseEntity.ok(ApiResponse.ok(authService.parseQr(qrFile)));
    }
}
