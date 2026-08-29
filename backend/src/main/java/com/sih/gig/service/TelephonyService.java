package com.sih.gig.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
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
import com.sih.gig.entity.User;
import com.sih.gig.repository.UserRepository;
import com.sih.gig.dto.request.CreateBookingRequest;
import lombok.RequiredArgsConstructor;
import java.util.Optional;
import java.util.UUID;

@Service
@Slf4j
@RequiredArgsConstructor
public class TelephonyService {

    private final UserRepository userRepository;
    private final BookingService bookingService;
    private final PasswordEncoder passwordEncoder;

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

    public String handleDtmf(String fromPhone, String digits, String serviceType) {
        // Sanitize digits (remove any double quotes or non-numeric characters Exotel might add)
        if (digits != null) {
            digits = digits.replaceAll("[^0-9]", "");
        }
        
        // Sanitize serviceType (strip any accidental markdown or URL parameters pasted by the user)
        if (serviceType != null && serviceType.contains("]")) {
            serviceType = serviceType.substring(0, serviceType.indexOf("]"));
        }
        
        log.info("Exotel IVR: from={} pincode={} service={}", fromPhone, digits, serviceType);

        if ("9".equals(digits)) {
            return buildSayResponse("Emergency alert received. Authorities have been notified. Stay safe.");
        }

        String normalizedPhone = fromPhone;
        if (normalizedPhone != null) {
            if (normalizedPhone.startsWith("0")) {
                normalizedPhone = normalizedPhone.substring(1);
            } else if (normalizedPhone.startsWith("+91")) {
                normalizedPhone = normalizedPhone.substring(3);
            }
        } else {
            normalizedPhone = "Unknown";
        }

        // 1. Find or create the user
        Optional<User> existingUser = userRepository.findByPhone(normalizedPhone);
        User customer;
        if (existingUser.isPresent()) {
            customer = existingUser.get();
        } else {
            customer = User.builder()
                    .phone(normalizedPhone)
                    .role("CUSTOMER")
                    .name("IVR Customer")
                    .email("ivr_" + UUID.randomUUID().toString().substring(0, 8) + "@fixnow.local")
                    .password(passwordEncoder.encode("defaultIvrPassword123!"))
                    .build();
            customer = userRepository.save(customer);
        }

        // Map Exotel query params to Backend Enums
        String mappedServiceType = switch (serviceType.toLowerCase()) {
            case "electrical_general" -> "ELECTRICIAN";
            case "ac_repair" -> "AC_REPAIR";
            case "tv_repair" -> "APPLIANCE";
            case "plumbing_general" -> "PLUMBER";
            case "water_issues" -> "PLUMBER";
            case "carpentry_general", "carpentry_heavy" -> "CARPENTER";
            default -> "OTHER";
        };

        // 2. Create booking request with defaults for GPS
        CreateBookingRequest req = new CreateBookingRequest();
        req.setServiceType(mappedServiceType);
        req.setCategoryType("CUSTOM");
        req.setBookingType("INSTANT");
        req.setCustomPromptText("Generated via Exotel IVR");
        req.setLatitude(12.9716);  // Bangalore center default
        req.setLongitude(77.5946); // Bangalore center default
        req.setPincode(digits);
        req.setAddressText("IVR_REQUEST"); // Special flag for UI

        // 3. Create the booking
        try {
            bookingService.createBooking(customer, req, null);
            log.info("Successfully created IVR booking for phone {}", normalizedPhone);
        } catch (Exception e) {
            log.error("Failed to create IVR booking", e);
            return buildSayResponse("Sorry, we encountered an error placing your request. Please try again.");
        }

        return buildSayResponse(
                "Your request for " + serviceType.replace("_", " ") + " has been placed. " +
                "Our system is finding the nearest available worker in pincode " + digits + ". " +
                "They will call you shortly to confirm the exact location."
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
