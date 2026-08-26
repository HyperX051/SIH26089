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
import java.util.HashMap;

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
    private static final Map<String, BigDecimal> BASE_WAGES = new HashMap<>(Map.ofEntries(
            Map.entry("PLUMBER",          BigDecimal.valueOf(450.00)),
            Map.entry("ELECTRICIAN",      BigDecimal.valueOf(500.00)),
            Map.entry("CARPENTER",        BigDecimal.valueOf(420.00)),
            Map.entry("PAINTER",          BigDecimal.valueOf(380.00)),
            Map.entry("AC_REPAIR",        BigDecimal.valueOf(600.00)),
            Map.entry("CLEANING",         BigDecimal.valueOf(350.00)),
            Map.entry("PEST_CONTROL",     BigDecimal.valueOf(400.00)),
            Map.entry("CAR_MECHANIC",     BigDecimal.valueOf(550.00)),
            Map.entry("APPLIANCE",        BigDecimal.valueOf(480.00)),
            Map.entry("ROOFING",          BigDecimal.valueOf(500.00)),
            Map.entry("HANDYMAN",         BigDecimal.valueOf(380.00)),
            Map.entry("LAPTOP_REPAIR",    BigDecimal.valueOf(450.00)),
            Map.entry("WASHING_MACHINE",  BigDecimal.valueOf(420.00)),
            Map.entry("REFRIGERATOR",     BigDecimal.valueOf(450.00)),
            Map.entry("SOFA_CLEANING",    BigDecimal.valueOf(380.00)),
            Map.entry("WATER_PURIFIER",   BigDecimal.valueOf(350.00)),
            Map.entry("GEYSER_REPAIR",    BigDecimal.valueOf(400.00)),
            Map.entry("BATHROOM_CLEANING",BigDecimal.valueOf(320.00)),
            Map.entry("OTHER",            BigDecimal.valueOf(350.00))
    ));

    /**
     * POST /api/v1/bookings
     */
    @Transactional
    public Map<String, Object> createBooking(User customer, CreateBookingRequest req, String photoUrl) {
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
                .issuePhotoUrl(photoUrl)
                .build();

        Booking saved = bookingRepository.save(booking);

        // Broadcast to all workers
        broadcaster.broadcastNewJob(Map.of(
            "booking_id", saved.getId().toString(),
            "service_type", saved.getServiceType(),
            "latitude", saved.getLatitude(),
            "longitude", saved.getLongitude(),
            "scheduled_for", saved.getScheduledFor() != null ? saved.getScheduledFor().toString() : "",
            "estimated_wage", saved.getBaseWage()
        ));

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
                    "name",             w.getUser().getName() != null ? w.getUser().getName() : "",
                    "phone",            w.getUser().getPhone(),
                    "rating",           w.getRating(),
                    "aadhaar_verified", w.getAadhaarVerified(),
                    "iti_certified",    w.getItiCertified(),
                    "nsqf_level",       w.getNsqfLevel() != null ? w.getNsqfLevel() : ""
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

    public java.util.List<Map<String, Object>> getCustomerBookings(User customer) {
        return bookingRepository.findByCustomerId(customer.getId())
                .stream()
                .map(b -> Map.<String, Object>of(
                        "id", b.getId().toString(),
                        "serviceType", b.getServiceType(),
                        "status", b.getStatus(),
                        "amount", b.getBaseWage().add(b.getMaterialCost()),
                        "date", b.getCreatedAt() != null ? b.getCreatedAt().toString() : ""
                ))
                .toList();
    }

    /**
     * GET /api/v1/bookings/available
     */
    public java.util.List<Map<String, Object>> getAvailableBookings() {
        return bookingRepository.findByStatus("SEARCHING").stream()
                .map(b -> {
                    Map<String, Object> map = new LinkedHashMap<>();
                    map.put("booking_id", b.getId().toString());
                    map.put("service_type", b.getServiceType());
                    map.put("latitude", b.getLatitude());
                    map.put("longitude", b.getLongitude());
                    map.put("estimated_wage", b.getBaseWage());
                    map.put("scheduled_for", b.getScheduledFor() != null ? b.getScheduledFor().toString() : "");
                    return map;
                })
                .toList();
    }

    /**
     * POST /api/v1/bookings/:id/accept
     */
    @Transactional
    public Map<String, Object> acceptJob(UUID bookingId, User workerUser) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> ApiException.notFound("Booking not found"));
        
        if (!"SEARCHING".equals(booking.getStatus())) {
            throw ApiException.badRequest("Booking is no longer available");
        }
        
        Worker worker = workerRepository.findByUserId(workerUser.getId())
                .orElseThrow(() -> ApiException.notFound("Worker profile not found"));
                
        booking.setWorker(worker);
        booking.setStatus("ACCEPTED");
        bookingRepository.save(booking);
        
        broadcaster.sendStatusChanged(bookingId, "ACCEPTED");
        
        return Map.of("status", "ACCEPTED", "booking_id", booking.getId().toString());
    }

    /**
     * Called from WebSocket GIG_RESPONSE handler.
     */
    public void processGigResponse(UUID bookingId, UUID workerUserId, String action, String reason) {
        dispatchService.handleGigResponse(bookingId, workerUserId, action);
    }
}
