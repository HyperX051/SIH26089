package com.sih.gig.controller;

import com.sih.gig.service.TelephonyService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

/**
 * Exotel IVR Webhook Controller.
 *
 * Exotel sends POST requests with form-encoded params.
 * Responses must be valid XML (TwiML-compatible).
 */
@RestController
@RequestMapping("/api/v1/telephony/exotel")
@RequiredArgsConstructor
public class TelephonyController {

    private final TelephonyService telephonyService;

    /**
     * POST /api/v1/telephony/exotel/incoming
     * Exotel calls this when a new call comes in.
     * Params: From, CallSid, To
     */
    @RequestMapping(value = "/incoming",
                 method = {RequestMethod.GET, RequestMethod.POST},
                 produces = MediaType.APPLICATION_XML_VALUE)
    public ResponseEntity<String> handleIncoming(@RequestParam Map<String, String> allParams) {

        String from = allParams.getOrDefault("From", allParams.get("from"));
        String callSid = allParams.getOrDefault("CallSid", allParams.get("callSid"));
        String to = allParams.getOrDefault("To", allParams.get("to"));

        String xml = telephonyService.handleIncomingCall(from, callSid, to);
        return ResponseEntity.ok(xml);
    }

    /**
     * POST /api/v1/telephony/exotel/dtmf-handler
     * Exotel calls this after caller presses a digit.
     * Params: CallSid, Digits
     */
    @RequestMapping(value = "/dtmf-handler",
                 method = {RequestMethod.GET, RequestMethod.POST},
                 produces = MediaType.APPLICATION_XML_VALUE)
    public ResponseEntity<String> handleDtmf(@RequestParam Map<String, String> allParams) {

        // Exotel might pass parameters in lowercase or TitleCase depending on context
        String fromPhone = allParams.getOrDefault("From", allParams.get("from"));
        String digits = allParams.getOrDefault("Digits", allParams.get("digits"));
        String serviceType = allParams.getOrDefault("service", "OTHER");

        String xml = telephonyService.handleDtmf(fromPhone, digits, serviceType);
        return ResponseEntity.ok(xml);
    }
}
