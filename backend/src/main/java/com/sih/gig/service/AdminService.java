package com.sih.gig.service;

import com.sih.gig.entity.CooperativeLedger;
import com.sih.gig.entity.Worker;
import com.sih.gig.exception.ApiException;
import com.sih.gig.repository.BookingRepository;
import com.sih.gig.repository.CooperativeLedgerRepository;
import com.sih.gig.repository.WorkerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final CooperativeLedgerRepository ledgerRepository;
    private final BookingRepository bookingRepository;
    private final WorkerRepository workerRepository;
    private final com.sih.gig.repository.SosAlertRepository sosAlertRepository;

    private static final String DEFAULT_SOCIETY = "soc_chennai_01";

    /**
     * GET /api/v1/admin/cooperative/dividend-ledger
     * Executed in SERIALIZABLE isolation to protect ledger integrity.
     */
    @Transactional(isolation = Isolation.SERIALIZABLE, readOnly = true)
    public Map<String, Object> getDividendLedger() {
        // Calculate dynamically
        BigDecimal grossTurnover = bookingRepository.sumCompletedBookingTurnover();
        BigDecimal commissionRate = BigDecimal.valueOf(0.05); // 5% commission
        BigDecimal commissionReserve = grossTurnover.multiply(commissionRate);
        BigDecimal dividendPoolBalance = commissionReserve.multiply(BigDecimal.valueOf(0.80)); // 80% goes to dividend pool
        
        // Count verified workers for eligibility
        long eligibleWorkerCount = workerRepository.findByApprovalStatus("APPROVED").size();

        return Map.of(
                "society_id",              DEFAULT_SOCIETY,
                "gross_turnover",          grossTurnover,
                "commission_reserve",      commissionReserve,
                "dividend_pool_balance",   dividendPoolBalance,
                "eligible_worker_count",   eligibleWorkerCount
        );
    }

    // Dynamic, so we no longer need to incrementally update the DB row.

    /**
     * GET /api/v1/admin/stats
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getGlobalStats() {
        long activeWorkers = workerRepository.countByIsAvailableTrue();
        long totalBookings = bookingRepository.count();
        
        java.util.List<com.sih.gig.entity.Booking> allBookings = bookingRepository.findAll();
        double totalSeconds = 0;
        int count = 0;
        
        for (com.sih.gig.entity.Booking b : allBookings) {
            if (b.getAcceptedAt() != null && b.getCreatedAt() != null) {
                totalSeconds += java.time.Duration.between(b.getCreatedAt(), b.getAcceptedAt()).getSeconds();
                count++;
            }
        }
        
        long avgDispatchTimeSeconds = count > 0 ? (long) (totalSeconds / count) : 0;

        return Map.of(
                "active_workers", activeWorkers,
                "total_bookings", totalBookings,
                "avg_dispatch_time_seconds", avgDispatchTimeSeconds
        );
    }

    /**
     * GET /api/v1/admin/stats/distribution
     */
    @Transactional(readOnly = true)
    public Map<String, Long> getServiceDistribution() {
        return bookingRepository.findAll().stream()
                .collect(java.util.stream.Collectors.groupingBy(
                        com.sih.gig.entity.Booking::getServiceType,
                        java.util.stream.Collectors.counting()
                ));
    }

    /**
     * GET /api/v1/admin/workers/kyc-pending
     */
    @Transactional(readOnly = true)
    public java.util.List<Map<String, Object>> getPendingKyc() {
        return workerRepository.findByApprovalStatus("PENDING").stream()
                .map(w -> Map.<String, Object>of(
                        "id", w.getId().toString(),
                        "name", w.getUser().getName() != null ? w.getUser().getName() : "",
                        "phone", w.getUser().getPhone(),
                        "skill_type", w.getTier() // Or perhaps we could look at bookings or just display Tier
                ))
                .toList();
    }

    /**
     * GET /api/v1/admin/bookings/live
     */
    @Transactional(readOnly = true)
    public java.util.List<Map<String, Object>> getLiveBookings() {
        return bookingRepository.findAll().stream()
                .filter(b -> java.util.List.of("SEARCHING", "ACCEPTED", "IN_PROGRESS", "ARRIVED").contains(b.getStatus()))
                .map(b -> Map.<String, Object>of(
                        "booking_id", b.getId().toString(),
                        "latitude", b.getLatitude() != null ? b.getLatitude().doubleValue() : 0.0,
                        "longitude", b.getLongitude() != null ? b.getLongitude().doubleValue() : 0.0,
                        "status", b.getStatus(),
                        "service_type", b.getServiceType()
                ))
                .toList();
    }

    /** GET /api/v1/admin/workers/active */
    @Transactional(readOnly = true)
    public java.util.List<Map<String, Object>> getActiveWorkers() {
        return workerRepository.findByIsAvailableTrue().stream()
                .map(w -> Map.<String, Object>of(
                        "id", w.getId().toString(),
                        "name", w.getUser().getName() != null ? w.getUser().getName() : "",
                        "phone", w.getUser().getPhone(),
                        "tier", w.getTier(),
                        "rating", w.getRating(),
                        "total_jobs", w.getTotalJobs(),
                        "latitude", w.getLatitude() != null ? w.getLatitude() : 0.0,
                        "longitude", w.getLongitude() != null ? w.getLongitude() : 0.0
                ))
                .toList();
    }

    /** GET /api/v1/admin/bookings */
    @Transactional(readOnly = true)
    public java.util.List<Map<String, Object>> getAllBookings() {
        return bookingRepository.findAll().stream()
                .map(b -> Map.<String, Object>of(
                        "id", b.getId().toString(),
                        "customer_name", b.getCustomer().getName() != null ? b.getCustomer().getName() : "",
                        "customer_phone", b.getCustomer().getPhone(),
                        "service_type", b.getServiceType(),
                        "status", b.getStatus(),
                        "created_at", b.getCreatedAt() != null ? b.getCreatedAt().toString() : "",
                        "base_wage", b.getBaseWage(),
                        "material_cost", b.getMaterialCost(),
                        "worker_name", b.getWorker() != null && b.getWorker().getUser().getName() != null ? b.getWorker().getUser().getName() : "Unassigned"
                ))
                .toList();
    }

    /** GET /api/v1/admin/sos */
    @Transactional(readOnly = true)
    public java.util.List<Map<String, Object>> getSosAlerts() {
        return sosAlertRepository.findAll().stream()
                .map(s -> Map.<String, Object>of(
                        "id", s.getId().toString(),
                        "booking_id", s.getBooking() != null ? s.getBooking().getId().toString() : "",
                        "user_name", s.getUser().getName() != null ? s.getUser().getName() : "",
                        "user_phone", s.getUser().getPhone(),
                        "latitude", s.getLatitude(),
                        "longitude", s.getLongitude(),
                        "status", s.getStatus(),
                        "created_at", s.getCreatedAt() != null ? s.getCreatedAt().toString() : ""
                ))
                .toList();
    }

    /** POST /api/v1/admin/sos/{id}/resolve */
    @Transactional
    public Map<String, Object> resolveSosAlert(java.util.UUID sosId) {
        com.sih.gig.entity.SosAlert alert = sosAlertRepository.findById(sosId)
                .orElseThrow(() -> ApiException.notFound("SOS Alert not found"));
        
        alert.setStatus("RESOLVED");
        sosAlertRepository.save(alert);
        
        return Map.of("message", "SOS Alert resolved successfully", "id", alert.getId().toString());
    }

    /** GET /api/v1/admin/cooperative/ledger-breakdown */
    @Transactional(readOnly = true)
    public java.util.List<Map<String, Object>> getLedgerBreakdown() {
        return bookingRepository.findAll().stream()
                .filter(b -> "COMPLETED".equals(b.getStatus()))
                .map(b -> {
                    BigDecimal totalTurnover = b.getBaseWage().add(b.getMaterialCost());
                    BigDecimal commission = totalTurnover.multiply(BigDecimal.valueOf(0.05));
                    return Map.<String, Object>of(
                            "booking_id", b.getId().toString(),
                            "service_type", b.getServiceType(),
                            "completed_at", b.getUpdatedAt() != null ? b.getUpdatedAt().toString() : "",
                            "total_turnover", totalTurnover,
                            "commission_deducted", commission,
                            "worker_name", b.getWorker() != null && b.getWorker().getUser().getName() != null ? b.getWorker().getUser().getName() : ""
                    );
                })
                .toList();
    }
}
