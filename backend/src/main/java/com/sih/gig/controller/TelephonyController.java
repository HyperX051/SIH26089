package com.sih.gig.controller;

import com.sih.gig.service.TelephonyService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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
    @PostMapping(value = "/incoming",
                 consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE,
                 produces = MediaType.APPLICATION_XML_VALUE)
    public ResponseEntity<String> handleIncoming(
            @RequestParam(value = "From",    required = false) String from,
            @RequestParam(value = "CallSid", required = false) String callSid,
            @RequestParam(value = "To",      required = false) String to) {

        String xml = telephonyService.handleIncomingCall(from, callSid, to);
        return ResponseEntity.ok(xml);
    }

    /**
     * POST /api/v1/telephony/exotel/dtmf-handler
     * Exotel calls this after caller presses a digit.
     * Params: CallSid, Digits
     */
    @PostMapping(value = "/dtmf-handler",
                 consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE,
                 produces = MediaType.APPLICATION_XML_VALUE)
    public ResponseEntity<String> handleDtmf(
            @RequestParam(value = "CallSid", required = false) String callSid,
            @RequestParam(value = "Digits",  required = false) String digits) {

        String xml = telephonyService.handleDtmf(callSid, digits);
        return ResponseEntity.ok(xml);
    }
}
