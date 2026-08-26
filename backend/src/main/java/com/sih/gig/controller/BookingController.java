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
import org.springframework.web.multipart.MultipartFile;
import com.sih.gig.service.FileStorageService;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/bookings")
@RequiredArgsConstructor
public class BookingController {

    private final BookingService bookingService;
    private final FileStorageService fileStorageService;
    private final com.fasterxml.jackson.databind.ObjectMapper objectMapper;

    /** POST /api/v1/bookings (with optional photo - multipart) */
    @PostMapping(consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<?>> createBookingMultipart(
            @RequestPart("booking") String bookingJson,
            @RequestPart(value = "photo", required = false) MultipartFile photo,
            Authentication auth) throws Exception {
        User currentUser = (User) auth.getPrincipal();
        CreateBookingRequest req = objectMapper.readValue(bookingJson, CreateBookingRequest.class);
        String photoUrl = null;
        if (photo != null && !photo.isEmpty()) {
            photoUrl = fileStorageService.storeFile(photo);
        }
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.ok(bookingService.createBooking(currentUser, req, photoUrl)));
    }

    /** POST /api/v1/bookings (no photo - JSON) */
    @PostMapping(consumes = org.springframework.http.MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<ApiResponse<?>> createBookingJson(
            @RequestBody @Valid CreateBookingRequest req,
            Authentication auth) {
        User currentUser = (User) auth.getPrincipal();
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.ok(bookingService.createBooking(currentUser, req, null)));
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
    /** GET /api/v1/bookings/available */
    @GetMapping("/available")
    public ResponseEntity<ApiResponse<?>> getAvailableBookings() {
        return ResponseEntity.ok(ApiResponse.ok(bookingService.getAvailableBookings()));
    }

    /** POST /api/v1/bookings/:id/accept */
    @PostMapping("/{id}/accept")
    public ResponseEntity<ApiResponse<?>> acceptJob(
            @PathVariable UUID id,
            Authentication auth) {
        User currentUser = (User) auth.getPrincipal();
        return ResponseEntity.ok(ApiResponse.ok(bookingService.acceptJob(id, currentUser)));
    }
}
