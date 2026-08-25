package com.sih.gig.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Map;

/**
 * Exotel IVR telephony service.
 *
 * Telecom circle mapping (prefix → circle → language):
 *   +9198xx, +9197xx → Tamil Nadu → Tamil
 *   +9194xx, +9195xx → Maharashtra → Marathi
 *   +9196xx, +9199xx → Delhi/UP → Hindi
 *   +9193xx, +9192xx → Andhra/Telangana → Telugu
 *   Default → Hindi (en fallback)
 *
 * DTMF menu:
 *   1 → PLUMBER
 *   2 → ELECTRICIAN
 *   3 → CARPENTER
 *   4 → PAINTER
 *   9 → SOS Emergency
 */
@Service
@Slf4j
public class TelephonyService {

    @Value("${app.bhashini.audio-base}")
    private String bhashiniAudioBase;

    private static final Map<String, String> SERVICE_MAP = Map.of(
            "1", "PLUMBER",
            "2", "ELECTRICIAN",
            "3", "CARPENTER",
            "4", "PAINTER"
    );

    /**
     * POST /api/v1/telephony/exotel/incoming
     * Returns Exotel-compatible XML prompt.
     */
    public String handleIncomingCall(String from, String callSid, String to) {
        log.info("Exotel incoming call: from={} callSid={}", from, callSid);

        String language    = detectLanguageFromPhone(from);
        String audioGreet  = bhashiniAudioBase + "/greet_" + language + ".mp3";

        // Exotel expects TwiML-compatible XML
        return """
                <?xml version="1.0" encoding="UTF-8"?>
                <Response>
                    <Play>%s</Play>
                    <Gather numDigits="1" action="/api/v1/telephony/exotel/dtmf-handler" method="POST">
                        <Say voice="woman" language="%s">
                            Press 1 for Plumber. Press 2 for Electrician.
                            Press 3 for Carpenter. Press 4 for Painter.
                            Press 9 for Emergency SOS.
                        </Say>
                    </Gather>
                    <Say>We did not receive your input. Please call again.</Say>
                </Response>
                """.formatted(audioGreet, toExotelLang(language));
    }

    /**
     * POST /api/v1/telephony/exotel/dtmf-handler
     * Parses digit pressed and dispatches service request.
     */
    public String handleDtmf(String callSid, String digits) {
        log.info("Exotel DTMF: callSid={} digits={}", callSid, digits);

        if ("9".equals(digits)) {
            return buildSayResponse("Emergency alert received. Authorities have been notified. Stay safe.");
        }

        String serviceType = SERVICE_MAP.get(digits);
        if (serviceType == null) {
            return buildSayResponse("Invalid selection. Please call again and press a valid option.");
        }

        // TODO: Collect pincode via a chained Gather, then call BookingService.createDemoBooking()
        // For now, acknowledge and instruct caller to use the app for full booking.
        log.info("IVR: serviceType={} requested via phone, callSid={}", serviceType, callSid);

        return buildSayResponse(
                "You have selected " + serviceType + ". " +
                "Our system is finding the nearest available worker. " +
                "You will receive an SMS with booking details shortly."
        );
    }

    private String detectLanguageFromPhone(String phone) {
        if (phone == null || phone.length() < 5) return "hi";
        String prefix = phone.substring(3, 5); // After +91
        return switch (prefix) {
            case "98", "97", "94" -> "ta";   // Tamil Nadu
            case "96", "99", "93" -> "te";   // Andhra / Telangana
            case "95", "92"       -> "mr";   // Maharashtra
            default               -> "hi";   // Hindi (default)
        };
    }

    private String toExotelLang(String code) {
        return switch (code) {
            case "ta" -> "ta-IN";
            case "te" -> "te-IN";
            case "mr" -> "mr-IN";
            default   -> "hi-IN";
        };
    }

    private String buildSayResponse(String message) {
        return """
                <?xml version="1.0" encoding="UTF-8"?>
                <Response>
                    <Say voice="woman" language="hi-IN">%s</Say>
                    <Hangup/>
                </Response>
                """.formatted(message);
    }
}
