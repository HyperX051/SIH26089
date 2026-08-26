package com.sih.gig.service;

import com.sih.gig.dto.request.CancelBookingRequest;
import com.sih.gig.dto.request.CreateBookingRequest;
import com.sih.gig.dto.request.VerifyOtpCompleteRequest;
import com.sih.gig.entity.*;
import com.sih.gig.exception.ApiException;
import com.sih.gig.repository.*;
import com.sih.gig.security.OtpHashUtil;
import com.sih.gig.websocket.SocketBroadcaster;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class BookingService {

    private final BookingRepository bookingRepository;
    private final CancellationRepository cancellationRepository;
    private final UserRepository userRepository;
    private final WorkerRepository workerRepository;
    private final OtpHashUtil otpHashUtil;
    private final DispatchService dispatchService;
    private final SocketBroadcaster broadcaster;

    // Base wage lookup per service type (GOI rates, simplified)
    private static final Map<String, BigDecimal> BASE_WAGES = Map.of(
            "PLUMBER",      BigDecimal.valueOf(450.00),
            "ELECTRICIAN",  BigDecimal.valueOf(500.00),
            "CARPENTER",    BigDecimal.valueOf(420.00),
            "PAINTER",      BigDecimal.valueOf(380.00),
            "OTHER",        BigDecimal.valueOf(350.00)
    );

    /**
     * POST /api/v1/bookings
     */
    @Transactional
    public Map<String, Object> createBooking(User customer, CreateBookingRequest req) {
        String otp     = otpHashUtil.generateOtp();
        String otpHash = otpHashUtil.hashOtp(otp);

        BigDecimal baseWage = BASE_WAGES.getOrDefault(req.getServiceType(), BigDecimal.valueOf(350.00));

        Booking booking = Booking.builder()
                .customer(customer)
                .serviceType(req.getServiceType())
                .categoryType(req.getCategoryType())
                .customPromptText(req.getCustomPromptText())
                .bookingType(req.getBookingType())
                .status("SEARCHING")
                .baseWage(baseWage)
                .materialCost(BigDecimal.ZERO)
                .otpHash(otpHash)
                .otpCode(otp)          // plaintext for display to customer only
                .scheduledFor(req.getScheduledFor())
                .latitude(BigDecimal.valueOf(req.getLatitude()))
                .longitude(BigDecimal.valueOf(req.getLongitude()))
                .pincode(req.getPincode())
                .addressText(req.getAddressText())
                .build();

        Booking saved = bookingRepository.save(booking);

        // Trigger async geo-spatial dispatch
        dispatchService.startDispatch(saved);

        return new LinkedHashMap<>(Map.of(
                "booking_id", saved.getId().toString(),
                "status",     "SEARCHING",
                "base_wage",  saved.getBaseWage(),
                "otp_code",   otp,
                "created_at", saved.getCreatedAt() != null ? saved.getCreatedAt().toString() : OffsetDateTime.now().toString()
        ));
    }

    /**
     * GET /api/v1/bookings/:id
     */
    public Map<String, Object> getBookingDetails(UUID bookingId) {
        Booking booking = bookingRepository.findByIdWithDetails(bookingId)
                .orElseThrow(() -> ApiException.notFound("Booking not found"));

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("booking_id",   booking.getId().toString());
        result.put("status",       booking.getStatus());
        result.put("service_type", booking.getServiceType());

        // Customer info
        User cust = booking.getCustomer();
        result.put("customer", Map.of(
                "name",  cust.getName() != null ? cust.getName() : "",
                "phone", cust.getPhone()
        ));

        // Worker info (if assigned)
        if (booking.getWorker() != null) {
            Worker w = booking.getWorker();
            result.put("worker", Map.of(
                    "name",           w.getUser().getName() != null ? w.getUser().getName() : "",
                    "phone",          w.getUser().getPhone(),
                    "rating",         w.getRating(),
                    "ncct_certified", w.getNcctCertified()
            ));
        } else {
            result.put("worker", null);
        }

        // Pricing
        BigDecimal total = booking.getBaseWage().add(booking.getMaterialCost());
        result.put("pricing", Map.of(
                "base_wage",      booking.getBaseWage(),
                "material_cost",  booking.getMaterialCost(),
                "total_amount",   total
        ));

        result.put("otp_code", booking.getOtpCode());
        return result;
    }

    /**
     * POST /api/v1/bookings/:id/cancel
     * Compensated cancellation: 80% fee to worker if cancelled ≤ 1 hr before scheduled service.
     */
    @Transactional
    public Map<String, Object> cancelBooking(UUID bookingId, CancelBookingRequest req) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> ApiException.notFound("Booking not found"));

        if (List.of("COMPLETED", "CANCELLED", "CANCELLED_COMPENSATED").contains(booking.getStatus())) {
            throw ApiException.badRequest("Booking is already in a terminal state");
        }

        BigDecimal cancellationFee = BigDecimal.ZERO;
        BigDecimal workerPayout    = BigDecimal.ZERO;
        String finalStatus         = "CANCELLED";

        // Compensated rule: cancelled ≤ 1 hr before scheduled_for OR already ACCEPTED/IN_PROGRESS
        boolean isLateCancel = false;
        if (booking.getScheduledFor() != null) {
            long hoursUntilService = java.time.Duration.between(
                    OffsetDateTime.now(), booking.getScheduledFor()).toHours();
            isLateCancel = hoursUntilService <= 1;
        } else if (List.of("ACCEPTED","ARRIVED","IN_PROGRESS").contains(booking.getStatus())) {
            isLateCancel = true;
        }

        if (isLateCancel && booking.getWorker() != null) {
            cancellationFee = BigDecimal.valueOf(50.00);
            workerPayout    = cancellationFee.multiply(BigDecimal.valueOf(0.80));
            finalStatus     = "CANCELLED_COMPENSATED";
        }

        booking.setStatus(finalStatus);
        bookingRepository.save(booking);

        Cancellation cancellation = Cancellation.builder()
                .booking(booking)
                .reason(req.getReason())
                .cancelledBy(req.getCancelledBy())
                .fee(cancellationFee)
                .workerPayout(workerPayout)
                .build();
        cancellationRepository.save(cancellation);

        broadcaster.sendStatusChanged(bookingId, finalStatus);

        return Map.of(
                "status",            finalStatus,
                "cancellation_fee",  cancellationFee,
                "worker_payout",     workerPayout
        );
    }

    /**
     * POST /api/v1/bookings/:id/verify-otp-complete
     * Mutual ticket closure — verifies BCrypt OTP hash before marking COMPLETED.
     */
    @Transactional
    public Map<String, Object> verifyAndComplete(UUID bookingId, VerifyOtpCompleteRequest req) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> ApiException.notFound("Booking not found"));

        if (!"IN_PROGRESS".equals(booking.getStatus()) && !"ARRIVED".equals(booking.getStatus())) {
            throw ApiException.badRequest("Booking is not in a closable state");
        }

        if (!otpHashUtil.verifyOtp(req.getEnteredOtp(), booking.getOtpHash())) {
            throw ApiException.unauthorized("Invalid OTP — ticket closure denied");
        }

        booking.setStatus("COMPLETED");
        bookingRepository.save(booking);
        broadcaster.sendStatusChanged(bookingId, "COMPLETED");

        BigDecimal total = booking.getBaseWage().add(booking.getMaterialCost());

        return Map.of(
                "status",          "COMPLETED",
                "payment_pending", true,
                "total_amount",    total
        );
    }

    /**
     * Called from WebSocket GIG_RESPONSE handler.
     */
    public void processGigResponse(UUID bookingId, UUID workerUserId, String action, String reason) {
        dispatchService.handleGigResponse(bookingId, workerUserId, action);
    }
}
