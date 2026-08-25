package com.sih.gig.controller;

import com.sih.gig.dto.response.ApiResponse;
import com.sih.gig.service.AdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;

    /** GET /api/v1/admin/cooperative/dividend-ledger */
    @GetMapping("/cooperative/dividend-ledger")
    public ResponseEntity<ApiResponse<?>> getDividendLedger() {
        return ResponseEntity.ok(ApiResponse.ok(adminService.getDividendLedger()));
    }
}
