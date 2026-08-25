package com.sih.gig.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * WebSocket / STOMP configuration.
 *
 * Connection URL : ws://localhost:8080/ws  (or /ws/websocket for raw WSS)
 * Auth           : Pass JWT as a STOMP connect header: { "Authorization": "Bearer <token>" }
 *
 * Client-side subscribe targets:
 *   /topic/worker/{workerId}     → GIG_OFFERED events
 *   /topic/booking/{bookingId}   → STATUS_CHANGED events
 *   /topic/admin/sos             → SOS_ALERT events (admin only)
 *
 * Client-side send targets (app prefix):
 *   /app/gig-response            → GIG_RESPONSE from worker
 *   /app/location-update         → LOCATION_UPDATE telemetry from worker
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // Simple in-memory broker for /topic/** destinations
        registry.enableSimpleBroker("/topic");
        // Prefix for messages routed to @MessageMapping controllers
        registry.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*")
                .withSockJS();
    }
}
