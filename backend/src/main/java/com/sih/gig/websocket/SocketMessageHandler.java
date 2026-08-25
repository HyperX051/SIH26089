package com.sih.gig.websocket;

import com.sih.gig.entity.User;
import com.sih.gig.service.BookingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;

import java.util.Map;
import java.util.UUID;

/**
 * Handles incoming WebSocket STOMP messages from clients.
 *
 * Worker sends to /app/gig-response     → GIG_RESPONSE
 * Worker sends to /app/location-update  → LOCATION_UPDATE
 */
@Controller
@RequiredArgsConstructor
@Slf4j
public class SocketMessageHandler {

    private final BookingService bookingService;

    /** GIG_RESPONSE: Worker accepts or rejects a gig */
    @MessageMapping("/gig-response")
    public void handleGigResponse(@Payload Map<String, Object> payload,
                                  Authentication auth) {
        String bookingId = (String) payload.get("booking_id");
        String action    = (String) payload.get("action"); // "ACCEPT" | "REJECT"
        String reason    = (String) payload.getOrDefault("reason", "");

        User worker = (User) auth.getPrincipal();
        log.info("GIG_RESPONSE bookingId={} action={} workerId={}", bookingId, action, worker.getId());

        bookingService.processGigResponse(UUID.fromString(bookingId), worker.getId(), action, reason);
    }

    /** LOCATION_UPDATE: Worker sends live coordinates while en-route */
    @MessageMapping("/location-update")
    public void handleLocationUpdate(@Payload Map<String, Object> payload,
                                     Authentication auth) {
        String bookingId = (String) payload.get("booking_id");
        double latitude  = Double.parseDouble(payload.get("latitude").toString());
        double longitude = Double.parseDouble(payload.get("longitude").toString());

        User worker = (User) auth.getPrincipal();
        log.debug("LOCATION_UPDATE bookingId={} lat={} lng={} workerId={}", bookingId, latitude, longitude, worker.getId());

        // Broadcast location to customer tracking topic
        // (broadcast is done via SocketBroadcaster from a service if needed)
    }
}
