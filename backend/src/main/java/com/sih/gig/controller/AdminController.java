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

    /** GET /api/v1/admin/stats */
    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<?>> getGlobalStats() {
        return ResponseEntity.ok(ApiResponse.ok(adminService.getGlobalStats()));
    }

    /** GET /api/v1/admin/stats/distribution */
    @GetMapping("/stats/distribution")
    public ResponseEntity<ApiResponse<?>> getServiceDistribution() {
        return ResponseEntity.ok(ApiResponse.ok(adminService.getServiceDistribution()));
    }

    /** GET /api/v1/admin/workers/kyc-pending */
    @GetMapping("/workers/kyc-pending")
    public ResponseEntity<ApiResponse<?>> getPendingKyc() {
        return ResponseEntity.ok(ApiResponse.ok(adminService.getPendingKyc()));
    }

    /** POST /api/v1/admin/workers/{id}/approve */
    @PostMapping("/workers/{id}/approve")
    public ResponseEntity<ApiResponse<?>> approveKyc(
            @PathVariable java.util.UUID id,
            @RequestBody(required = false) com.sih.gig.dto.request.ApproveKycRequest req) {
        return ResponseEntity.ok(ApiResponse.ok(adminService.approveKyc(id, req)));
    }

    /** POST /api/v1/admin/workers/{id}/reject */
    @PostMapping("/workers/{id}/reject")
    public ResponseEntity<ApiResponse<?>> rejectKyc(@PathVariable java.util.UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(adminService.rejectKyc(id)));
    }

    /** GET /api/v1/admin/bookings/live */
    @GetMapping("/bookings/live")
    public ResponseEntity<ApiResponse<?>> getLiveBookings() {
        return ResponseEntity.ok(ApiResponse.ok(adminService.getLiveBookings()));
    }

    /** GET /api/v1/admin/workers/active */
    @GetMapping("/workers/active")
    public ResponseEntity<ApiResponse<?>> getActiveWorkers() {
        return ResponseEntity.ok(ApiResponse.ok(adminService.getActiveWorkers()));
    }

    /** GET /api/v1/admin/bookings */
    @GetMapping("/bookings")
    public ResponseEntity<ApiResponse<?>> getAllBookings() {
        return ResponseEntity.ok(ApiResponse.ok(adminService.getAllBookings()));
    }

    /** GET /api/v1/admin/sos */
    @GetMapping("/sos")
    public ResponseEntity<ApiResponse<?>> getSosAlerts() {
        return ResponseEntity.ok(ApiResponse.ok(adminService.getSosAlerts()));
    }

    /** POST /api/v1/admin/sos/{id}/resolve */
    @PostMapping("/sos/{id}/resolve")
    public ResponseEntity<ApiResponse<?>> resolveSosAlert(@PathVariable java.util.UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(adminService.resolveSosAlert(id)));
    }

    /** GET /api/v1/admin/cooperative/ledger-breakdown */
    @GetMapping("/cooperative/ledger-breakdown")
    public ResponseEntity<ApiResponse<?>> getLedgerBreakdown() {
        return ResponseEntity.ok(ApiResponse.ok(adminService.getLedgerBreakdown()));
    }
}
