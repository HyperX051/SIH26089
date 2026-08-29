package com.sih.gig.websocket;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.UUID;

/**
 * Central broadcaster for all WebSocket events defined in API_CONTRACTS.
 *
 * Subscribe destinations:
 *   /topic/worker/{workerId}      ← GIG_OFFERED
 *   /topic/booking/{bookingId}    ← STATUS_CHANGED
 *   /topic/admin/sos              ← SOS_ALERT
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class SocketBroadcaster {

    private final SimpMessagingTemplate template;

    // ─── NEW_JOB_AVAILABLE (Bulletin Board) ───────────────────────────────────
    public void broadcastNewJob(Map<String, Object> payload) {
        log.debug("NEW_JOB_AVAILABLE → all workers");
        template.convertAndSend("/topic/jobs",
                Map.of("event", "NEW_JOB_AVAILABLE", "payload", payload));
    }

    // ─── GIG_OFFERED ──────────────────────────────────────────────────────────
    public void sendGigOffered(UUID workerId, Map<String, Object> payload) {
        log.debug("GIG_OFFERED → worker/{}", workerId);
        template.convertAndSend("/topic/worker/" + workerId,
                Map.of("event", "GIG_OFFERED", "payload", payload));
    }

    // ─── STATUS_CHANGED ───────────────────────────────────────────────────────
    public void sendStatusChanged(UUID bookingId, String status) {
        log.debug("STATUS_CHANGED → booking/{} status={}", bookingId, status);
        template.convertAndSend("/topic/booking/" + bookingId,
                Map.of("event", "STATUS_CHANGED",
                       "payload", Map.of("booking_id", bookingId.toString(),
                                          "status", status)));
    }

    // ─── SOS_ALERT ────────────────────────────────────────────────────────────
    public void sendSosAlert(UUID sosId, UUID bookingId, UUID userId,
                             double latitude, double longitude) {
        log.info("SOS_ALERT → admin/sos sosId={}", sosId);
        template.convertAndSend("/topic/admin/sos",
                Map.of("event", "SOS_ALERT",
                       "payload", Map.of(
                               "sos_id",     sosId.toString(),
                               "booking_id", bookingId != null ? bookingId.toString() : "",
                               "user_id",    userId.toString(),
                               "latitude",   latitude,
                               "longitude",  longitude
                       )));
    }

    // ─── ADMIN_STATS_UPDATE ───────────────────────────────────────────────────
    public void broadcastStatsUpdate() {
        log.debug("ADMIN_STATS_UPDATE → admin/stats");
        template.convertAndSend("/topic/admin/stats",
                Map.of("event", "ADMIN_STATS_UPDATE"));
    }
}
