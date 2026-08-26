package com.sih.gig.service;

import com.sih.gig.dto.request.UpdateAvailabilityRequest;
import com.sih.gig.dto.request.UpdateRadiusRequest;
import com.sih.gig.entity.User;
import com.sih.gig.entity.Worker;
import com.sih.gig.exception.ApiException;
import com.sih.gig.repository.BookingRepository;
import com.sih.gig.repository.WorkerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class WorkerService {

    private final WorkerRepository workerRepository;
    private final BookingRepository bookingRepository;

    private Worker getWorkerByUserId(UUID userId) {
        return workerRepository.findByUserId(userId)
                .orElseThrow(() -> ApiException.notFound("Worker profile not found"));
    }

    /**
     * PATCH /api/v1/workers/profile/radius
     */
    @Transactional
    public Map<String, Object> updateRadius(User currentUser, UpdateRadiusRequest req) {
        Worker worker = getWorkerByUserId(currentUser.getId());
        worker.setServiceRadiusKm(req.getServiceRadiusKm());
        workerRepository.save(worker);

        return Map.of(
                "worker_id",          worker.getId().toString(),
                "service_radius_km",  worker.getServiceRadiusKm()
        );
    }

    /**
     * PATCH /api/v1/workers/profile/availability
     */
    @Transactional
    public Map<String, Object> updateAvailability(User currentUser, UpdateAvailabilityRequest req) {
        Worker worker = getWorkerByUserId(currentUser.getId());
        worker.setIsAvailable(req.getIsAvailable());

        // Optionally update location
        if (req.getLatitude() != null && req.getLongitude() != null) {
            worker.setLatitude(BigDecimal.valueOf(req.getLatitude()));
            worker.setLongitude(BigDecimal.valueOf(req.getLongitude()));
        }
        workerRepository.save(worker);

        return Map.of(
                "worker_id",    worker.getId().toString(),
                "is_available", worker.getIsAvailable()
        );
    }

    /**
     * GET Location
     */
    public Map<String, Object> getWorkerLocation(User currentUser) {
        Worker worker = getWorkerByUserId(currentUser.getId());
        java.util.Map<String, Object> map = new java.util.HashMap<>();
        map.put("latitude", worker.getLatitude());
        map.put("longitude", worker.getLongitude());
        return map;
    }

    /**
     * GET Availability status
     */
    public Map<String, Object> getAvailability(User currentUser) {
        Worker worker = getWorkerByUserId(currentUser.getId());
        java.util.Map<String, Object> map = new java.util.HashMap<>();
        map.put("worker_id", worker.getId().toString());
        map.put("is_available", worker.getIsAvailable());
        return map;
    }

    /**
     * GET Profile details
     */
    public Map<String, Object> getWorkerProfile(User currentUser) {
        Worker worker = getWorkerByUserId(currentUser.getId());
        java.util.Map<String, Object> map = new java.util.HashMap<>();
        map.put("id", worker.getId().toString());
        map.put("name", currentUser.getName() != null ? currentUser.getName() : "");
        map.put("phone", currentUser.getPhone());
        map.put("photoUrl", worker.getPhotoUrl() != null ? worker.getPhotoUrl() : "");
        map.put("serviceRadiusKm", worker.getServiceRadiusKm());
        map.put("isAvailable", worker.getIsAvailable());
        map.put("rating", worker.getRating());
        map.put("tier", worker.getTier());
        map.put("totalJobs", worker.getTotalJobs());
        return map;
    }

    /**
     * GET Past Billing / Completed jobs
     */
    public java.util.List<Map<String, Object>> getPastBilling(User currentUser) {
        Worker worker = getWorkerByUserId(currentUser.getId());
        return bookingRepository.findByWorkerIdAndStatus(worker.getId(), "COMPLETED")
                .stream()
                .map(b -> Map.<String, Object>of(
                        "id", b.getId().toString(),
                        "serviceType", b.getServiceType(),
                        "baseWage", b.getBaseWage(),
                        "materialCost", b.getMaterialCost(),
                        "totalEarnings", b.getBaseWage().add(b.getMaterialCost()),
                        "completedAt", b.getUpdatedAt() != null ? b.getUpdatedAt().toString() : ""
                ))
                .toList();
    }
}
