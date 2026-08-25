package com.sih.gig.service;

import com.sih.gig.entity.Booking;
import com.sih.gig.entity.Worker;
import com.sih.gig.repository.BookingRepository;
import com.sih.gig.repository.WorkerRepository;
import com.sih.gig.websocket.SocketBroadcaster;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.MathContext;
import java.util.*;
import java.util.concurrent.*;

/**
 * PostGIS geo-spatial dispatch engine.
 *
 * Algorithm:
 * 1. ST_DWithin: find up to 10 nearest available workers ordered by distance.
 * 2. Emit GIG_OFFERED via WebSocket to the nearest worker.
 * 3. Wait 45 seconds for GIG_RESPONSE.
 * 4. If REJECT or TIMEOUT → cascade to next worker in the list.
 * 5. If all workers exhausted → mark booking as CANCELLED (no workers available).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DispatchService {

    private final WorkerRepository workerRepository;
    private final BookingRepository bookingRepository;
    private final SocketBroadcaster broadcaster;

    @Value("${app.dispatch.timeout-seconds}")
    private long timeoutSeconds;

    // Max search radius in meters (20 km)
    private static final double MAX_SEARCH_RADIUS_M = 20_000.0;

    // Track active dispatch queues: bookingId → iterator over worker list
    private final ConcurrentHashMap<UUID, DispatchState> activeDispatches = new ConcurrentHashMap<>();
    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(10);

    @Async
    public void startDispatch(Booking booking) {
        double lat = booking.getLatitude().doubleValue();
        double lng = booking.getLongitude().doubleValue();

        List<Worker> nearbyWorkers = workerRepository.findNearbyAvailableWorkers(lat, lng, MAX_SEARCH_RADIUS_M);

        if (nearbyWorkers.isEmpty()) {
            log.warn("No available workers found for booking {}", booking.getId());
            updateBookingStatus(booking.getId(), "CANCELLED");
            return;
        }

        DispatchState state = new DispatchState(nearbyWorkers.iterator());
        activeDispatches.put(booking.getId(), state);
        offerToNext(booking.getId(), booking, state);
    }

    private void offerToNext(UUID bookingId, Booking booking, DispatchState state) {
        if (!state.workers.hasNext()) {
            log.warn("All workers exhausted for booking {}", bookingId);
            updateBookingStatus(bookingId, "CANCELLED");
            activeDispatches.remove(bookingId);
            return;
        }

        Worker worker = state.workers.next();
        state.currentWorkerId = worker.getId();

        double distKm = haversineKm(
                booking.getLatitude().doubleValue(), booking.getLongitude().doubleValue(),
                worker.getLatitude().doubleValue(), worker.getLongitude().doubleValue()
        );

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("booking_id",       bookingId.toString());
        payload.put("service_type",     booking.getServiceType());
        payload.put("distance_km",      Math.round(distKm * 10.0) / 10.0);
        payload.put("estimated_wage",   booking.getBaseWage());
        payload.put("timeout_seconds",  timeoutSeconds);

        log.info("GIG_OFFERED → worker {} for booking {}", worker.getId(), bookingId);
        broadcaster.sendGigOffered(worker.getId(), payload);

        // Schedule cascade if no response within timeout
        ScheduledFuture<?> future = scheduler.schedule(() -> {
            DispatchState current = activeDispatches.get(bookingId);
            if (current != null && worker.getId().equals(current.currentWorkerId)) {
                log.info("GIG_OFFERED timeout — cascading booking {}", bookingId);
                offerToNext(bookingId, booking, current);
            }
        }, timeoutSeconds, TimeUnit.SECONDS);

        state.currentTimeout = future;
    }

    /**
     * Called from SocketMessageHandler on GIG_RESPONSE.
     */
    @Transactional
    public void handleGigResponse(UUID bookingId, UUID workerUserId, String action) {
        DispatchState state = activeDispatches.get(bookingId);
        if (state == null) return;

        // Cancel the timeout task
        if (state.currentTimeout != null) {
            state.currentTimeout.cancel(false);
        }

        Booking booking = bookingRepository.findById(bookingId).orElse(null);
        if (booking == null) return;

        Worker worker = workerRepository.findByUserId(workerUserId).orElse(null);

        if ("ACCEPT".equals(action) && worker != null) {
            booking.setWorker(worker);
            booking.setStatus("ACCEPTED");
            bookingRepository.save(booking);
            activeDispatches.remove(bookingId);
            broadcaster.sendStatusChanged(bookingId, "ACCEPTED");
            log.info("Booking {} ACCEPTED by worker {}", bookingId, workerUserId);
        } else {
            // REJECT — cascade
            log.info("Booking {} REJECTED by worker {} — cascading", bookingId, workerUserId);
            offerToNext(bookingId, booking, state);
        }
    }

    private void updateBookingStatus(UUID bookingId, String status) {
        bookingRepository.findById(bookingId).ifPresent(b -> {
            b.setStatus(status);
            bookingRepository.save(b);
            broadcaster.sendStatusChanged(bookingId, status);
        });
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

    private static class DispatchState {
        final Iterator<Worker> workers;
        UUID currentWorkerId;
        ScheduledFuture<?> currentTimeout;

        DispatchState(Iterator<Worker> workers) {
            this.workers = workers;
        }
    }
}
