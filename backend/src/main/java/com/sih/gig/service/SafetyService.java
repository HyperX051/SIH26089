package com.sih.gig.service;

import com.sih.gig.dto.request.SosRequest;
import com.sih.gig.entity.Booking;
import com.sih.gig.entity.SosAlert;
import com.sih.gig.entity.User;
import com.sih.gig.exception.ApiException;
import com.sih.gig.repository.BookingRepository;
import com.sih.gig.repository.SosAlertRepository;
import com.sih.gig.websocket.SocketBroadcaster;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class SafetyService {

    private final SosAlertRepository sosAlertRepository;
    private final BookingRepository bookingRepository;
    private final SocketBroadcaster broadcaster;

    /**
     * POST /api/v1/safety/sos
     */
    @Transactional
    public Map<String, Object> triggerSos(User currentUser, SosRequest req) {
        Booking booking = bookingRepository.findById(UUID.fromString(req.getBookingId()))
                .orElseThrow(() -> ApiException.notFound("Booking not found"));

        SosAlert sos = SosAlert.builder()
                .booking(booking)
                .user(currentUser)
                .latitude(BigDecimal.valueOf(req.getLatitude()))
                .longitude(BigDecimal.valueOf(req.getLongitude()))
                .telemetry(req.getTelemetry())
                .status("OPEN")
                .dispatchedAuthorities(true)
                .build();

        SosAlert saved = sosAlertRepository.save(sos);

        // Broadcast SOS_ALERT to admin command center
        broadcaster.sendSosAlert(
                saved.getId(),
                booking.getId(),
                currentUser.getId(),
                req.getLatitude(),
                req.getLongitude()
        );

        log.warn("🆘 SOS ALERT triggered: sosId={} bookingId={} userId={}",
                saved.getId(), booking.getId(), currentUser.getId());

        return Map.of(
                "sos_id",                 saved.getId().toString(),
                "status",                 "OPEN",
                "dispatched_authorities", true
        );
    }
}
