package com.sih.gig.service;

import com.sih.gig.dto.request.UpdateAvailabilityRequest;
import com.sih.gig.dto.request.UpdateRadiusRequest;
import com.sih.gig.entity.User;
import com.sih.gig.entity.Worker;
import com.sih.gig.exception.ApiException;
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
}
