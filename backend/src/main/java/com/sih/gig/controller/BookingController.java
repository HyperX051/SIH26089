package com.sih.gig.controller;

import com.sih.gig.dto.request.CancelBookingRequest;
import com.sih.gig.dto.request.CreateBookingRequest;
import com.sih.gig.dto.request.VerifyOtpCompleteRequest;
import com.sih.gig.dto.response.ApiResponse;
import com.sih.gig.entity.User;
import com.sih.gig.service.BookingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/bookings")
@RequiredArgsConstructor
public class BookingController {

    private final BookingService bookingService;

    /** POST /api/v1/bookings */
    @PostMapping
    public ResponseEntity<ApiResponse<?>> createBooking(
            @Valid @RequestBody CreateBookingRequest req,
            Authentication auth) {
        User currentUser = (User) auth.getPrincipal();
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.ok(bookingService.createBooking(currentUser, req)));
    }

    /** GET /api/v1/bookings/:id */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<?>> getBooking(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(bookingService.getBookingDetails(id)));
    }

    /** GET /api/v1/bookings/customer */
    @GetMapping("/customer")
    public ResponseEntity<ApiResponse<?>> getCustomerBookings(Authentication auth) {
        User currentUser = (User) auth.getPrincipal();
        return ResponseEntity.ok(ApiResponse.ok(bookingService.getCustomerBookings(currentUser)));
    }

    /** POST /api/v1/bookings/:id/cancel */
    @PostMapping("/{id}/cancel")
    public ResponseEntity<ApiResponse<?>> cancelBooking(
            @PathVariable UUID id,
            @Valid @RequestBody CancelBookingRequest req) {
        return ResponseEntity.ok(ApiResponse.ok(bookingService.cancelBooking(id, req)));
    }

    /** POST /api/v1/bookings/:id/verify-otp-complete */
    @PostMapping("/{id}/verify-otp-complete")
    public ResponseEntity<ApiResponse<?>> verifyOtpComplete(
            @PathVariable UUID id,
            @Valid @RequestBody VerifyOtpCompleteRequest req) {
        return ResponseEntity.ok(ApiResponse.ok(bookingService.verifyAndComplete(id, req)));
    }
}
