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
        java.util.Map<String, Object> broadcastPayload = new java.util.LinkedHashMap<>();
        broadcastPayload.put("booking_id", saved.getId().toString());
        broadcastPayload.put("service_type", saved.getServiceType());
        broadcastPayload.put("latitude", saved.getLatitude());
        broadcastPayload.put("longitude", saved.getLongitude());
        broadcastPayload.put("scheduled_for", saved.getScheduledFor() != null ? saved.getScheduledFor().toString() : "");
        broadcastPayload.put("estimated_wage", saved.getBaseWage());
        broadcastPayload.put("pincode", saved.getPincode());
        broadcastPayload.put("customer_phone", saved.getCustomer() != null ? saved.getCustomer().getPhone() : "");
        broadcastPayload.put("address_text", saved.getAddressText());
        broadcaster.broadcastNewJob(broadcastPayload);
        broadcaster.broadcastStatsUpdate();

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
        
        // Add UPI Payment URI if pending payment
        if ("PAYMENT_PENDING".equals(booking.getStatus()) && booking.getWorker() != null && booking.getWorker().getUpiId() != null) {
            String upiId = booking.getWorker().getUpiId();
            String uri = String.format("upi://pay?pa=%s&am=%s&cu=INR", upiId, total);
            result.put("payment_uri", uri);
        }

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

        if (!"IN_PROGRESS".equals(booking.getStatus()) && !"ARRIVED".equals(booking.getStatus()) && !"ACCEPTED".equals(booking.getStatus())) {
            throw ApiException.badRequest("Booking is not in a closable state");
        }

        if (!otpHashUtil.verifyOtp(req.getEnteredOtp(), booking.getOtpHash())) {
            throw ApiException.unauthorized("Invalid OTP — ticket closure denied");
        }

        booking.setStatus("PAYMENT_PENDING");
        bookingRepository.save(booking);
        broadcaster.sendStatusChanged(bookingId, "PAYMENT_PENDING");

        BigDecimal total = booking.getBaseWage().add(booking.getMaterialCost());

        String paymentUri = null;
        if (booking.getWorker() != null && booking.getWorker().getUpiId() != null) {
            String upiId = booking.getWorker().getUpiId();
            paymentUri = String.format("upi://pay?pa=%s&am=%s&cu=INR", upiId, total);
        }

        return Map.of(
                "status",          "PAYMENT_PENDING",
                "payment_pending", true,
                "total_amount",    total,
                "payment_uri",     paymentUri != null ? paymentUri : ""
        );
    }

    @Transactional
    public Map<String, Object> customerPaid(UUID bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> ApiException.notFound("Booking not found"));

        if (!"PAYMENT_PENDING".equals(booking.getStatus())) {
            throw ApiException.badRequest("Booking is not pending payment");
        }

        booking.setStatus("PAYMENT_CLAIMED");
        bookingRepository.save(booking);
        broadcaster.sendStatusChanged(bookingId, "PAYMENT_CLAIMED");

        return Map.of("status", "PAYMENT_CLAIMED");
    }

    @Transactional
    public Map<String, Object> workerConfirmPayment(UUID bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> ApiException.notFound("Booking not found"));

        if (!"PAYMENT_CLAIMED".equals(booking.getStatus())) {
            throw ApiException.badRequest("Payment has not been claimed by customer yet");
        }

        booking.setStatus("COMPLETED");
        if (booking.getWorker() != null) {
            Worker worker = booking.getWorker();
            worker.setTotalJobs(worker.getTotalJobs() + 1);
        }
        bookingRepository.save(booking);
        broadcaster.sendStatusChanged(bookingId, "COMPLETED");
        broadcaster.broadcastStatsUpdate();

        return Map.of("status", "COMPLETED");
    }

    @Transactional(readOnly = true)
    public java.util.List<Map<String, Object>> getCustomerBookings(User customer) {
        return bookingRepository.findByCustomerId(customer.getId())
                .stream()
                .map(b -> {
                    BigDecimal total = b.getBaseWage().add(b.getMaterialCost());
                    String paymentUri = null;
                    if ("PAYMENT_PENDING".equals(b.getStatus()) && b.getWorker() != null && b.getWorker().getUpiId() != null) {
                        String upiId = b.getWorker().getUpiId();
                        paymentUri = String.format("upi://pay?pa=%s&am=%s&cu=INR", upiId, total);
                    }
                    java.util.Map<String, Object> map = new java.util.LinkedHashMap<>();
                    map.put("id", b.getId().toString());
                    map.put("serviceType", b.getServiceType());
                    map.put("status", b.getStatus());
                    map.put("amount", total);
                    map.put("payment_uri", paymentUri != null ? paymentUri : "");
                    map.put("date", b.getCreatedAt() != null ? b.getCreatedAt().toString() : "");
                    map.put("address", b.getAddressText() != null ? b.getAddressText() : "");
                    map.put("pincode", b.getPincode() != null ? b.getPincode() : "");
                    map.put("otp_code", b.getOtpCode() != null ? b.getOtpCode() : "");
                    map.put("customer_rating", b.getCustomerRating());
                    if (b.getWorker() != null) {
                        Worker w = b.getWorker();
                        map.put("worker_name", w.getUser().getName() != null ? w.getUser().getName() : "Worker");
                        map.put("worker_phone", w.getUser().getPhone());
                        map.put("worker_rating", w.getRating());
                        map.put("worker_tier", w.getTier());
                        map.put("worker_iti_certified", w.getItiCertified());
                    } else {
                        map.put("worker_name", null);
                        map.put("worker_phone", null);
                        map.put("worker_rating", null);
                        map.put("worker_tier", null);
                        map.put("worker_iti_certified", null);
                    }
                    return map;
                })
                .toList();
    }

    /**
     * POST /api/v1/bookings/:id/rate
     */
    @Transactional
    public Map<String, Object> rateBooking(UUID bookingId, int stars, String comment, User customer) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> ApiException.notFound("Booking not found"));
        if (!"COMPLETED".equals(booking.getStatus())) {
            throw ApiException.badRequest("Can only rate completed bookings");
        }
        if (!booking.getCustomer().getId().equals(customer.getId())) {
            throw ApiException.unauthorized("You cannot rate this booking");
        }
        if (stars < 1 || stars > 5) {
            throw ApiException.badRequest("Rating must be between 1 and 5");
        }
        booking.setCustomerRating(stars);
        if (comment != null) {
            booking.setCustomerComment(comment);
        }
        bookingRepository.save(booking);

        // Update worker's aggregate rating
        if (booking.getWorker() != null) {
            Worker worker = booking.getWorker();
            java.util.List<Booking> ratedBookings = bookingRepository.findByWorkerIdAndStatus(worker.getId(), "COMPLETED")
                    .stream().filter(rb -> rb.getCustomerRating() != null).toList();
            double avg = ratedBookings.stream().mapToInt(Booking::getCustomerRating).average().orElse(stars);
            worker.setRating(java.math.BigDecimal.valueOf(avg).setScale(2, java.math.RoundingMode.HALF_UP));
            workerRepository.save(worker);
        }
        return Map.of("message", "Rating submitted", "rating", stars);
    }

    @Transactional(readOnly = true)
    public java.util.List<Map<String, Object>> getWorkerActiveBookings(User workerUser) {
        Worker worker = workerRepository.findByUserId(workerUser.getId())
            .orElseThrow(() -> ApiException.notFound("Worker profile not found"));
        
        java.util.List<Booking> active = new java.util.ArrayList<>();
        active.addAll(bookingRepository.findByWorkerIdAndStatus(worker.getId(), "ACCEPTED"));
        active.addAll(bookingRepository.findByWorkerIdAndStatus(worker.getId(), "ARRIVED"));
        active.addAll(bookingRepository.findByWorkerIdAndStatus(worker.getId(), "IN_PROGRESS"));
        active.addAll(bookingRepository.findByWorkerIdAndStatus(worker.getId(), "PAYMENT_PENDING"));
        active.addAll(bookingRepository.findByWorkerIdAndStatus(worker.getId(), "PAYMENT_CLAIMED"));
        
        return active.stream().map(b -> {
            java.util.Map<String, Object> map = new java.util.LinkedHashMap<>();
            map.put("booking_id", b.getId().toString());
            map.put("service_type", b.getServiceType());
            map.put("latitude", b.getLatitude());
            map.put("longitude", b.getLongitude());
            map.put("estimated_wage", b.getBaseWage());
            map.put("scheduled_for", b.getScheduledFor() != null ? b.getScheduledFor().toString() : "");
            map.put("custom_prompt_text", b.getCustomPromptText());
            map.put("status", b.getStatus());
            map.put("pincode", b.getPincode());
            map.put("customer_phone", b.getCustomer() != null ? b.getCustomer().getPhone() : "");
            map.put("address_text", b.getAddressText());
            if (("PAYMENT_PENDING".equals(b.getStatus()) || "PAYMENT_CLAIMED".equals(b.getStatus())) && worker.getUpiId() != null) {
                BigDecimal total = b.getBaseWage().add(b.getMaterialCost());
                String paymentUri = String.format("upi://pay?pa=%s&am=%s&cu=INR",
                    worker.getUpiId(), total);
                map.put("payment_uri", paymentUri);
            }
            return map;
        }).toList();
    }

    /**
     * GET /api/v1/bookings/available
     */
    @Transactional(readOnly = true)
    public java.util.List<Map<String, Object>> getAvailableBookings(User workerUser) {
        Worker worker = workerRepository.findByUserId(workerUser.getId())
                .orElseThrow(() -> ApiException.notFound("Worker profile not found"));
        
        return bookingRepository.findByStatus("SEARCHING").stream()
                .filter(b -> {
                    // Filter 1: If worker has a pincode and booking has a pincode, they must match
                    if (worker.getServicePincode() != null && !worker.getServicePincode().isEmpty() &&
                        b.getPincode() != null && !b.getPincode().isEmpty()) {
                        if (!worker.getServicePincode().equals(b.getPincode())) {
                            return false;
                        }
                    }
                    // Filter 2: Geographic radius
                    if (worker.getLatitude() != null && worker.getLongitude() != null && b.getLatitude() != null && b.getLongitude() != null) {
                        double distKm = haversineKm(
                            worker.getLatitude().doubleValue(), worker.getLongitude().doubleValue(),
                            b.getLatitude().doubleValue(), b.getLongitude().doubleValue()
                        );
                        if (distKm > worker.getServiceRadiusKm().doubleValue()) {
                            return false;
                        }
                    }
                    return true;
                })
                .map(b -> {
                    Map<String, Object> map = new LinkedHashMap<>();
                    map.put("booking_id", b.getId().toString());
                    map.put("service_type", b.getServiceType());
                    map.put("latitude", b.getLatitude());
                    map.put("longitude", b.getLongitude());
                    map.put("estimated_wage", b.getBaseWage());
                    map.put("scheduled_for", b.getScheduledFor() != null ? b.getScheduledFor().toString() : "");
                    map.put("custom_prompt_text", b.getCustomPromptText());
                    map.put("pincode", b.getPincode());
                    map.put("customer_phone", b.getCustomer() != null ? b.getCustomer().getPhone() : "");
                    map.put("address_text", b.getAddressText());
                    
                    if (worker.getLatitude() != null && worker.getLongitude() != null && b.getLatitude() != null && b.getLongitude() != null) {
                        double distKm = haversineKm(
                            worker.getLatitude().doubleValue(), worker.getLongitude().doubleValue(),
                            b.getLatitude().doubleValue(), b.getLongitude().doubleValue()
                        );
                        map.put("distance_km", Math.round(distKm * 10.0) / 10.0);
                    } else {
                        map.put("distance_km", 0.0);
                    }
                    return map;
                })
                .toList();
    }

    /** Haversine distance formula */
    private double haversineKm(double lat1, double lng1, double lat2, double lng2) {
        final double R = 6371.0;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                 + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                 * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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
                
        if (!Boolean.TRUE.equals(worker.getIsAvailable())) {
            throw ApiException.badRequest("You must be online to accept jobs");
        }
                
        booking.setWorker(worker);
        booking.setStatus("ACCEPTED");
        booking.setAcceptedAt(OffsetDateTime.now());
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
