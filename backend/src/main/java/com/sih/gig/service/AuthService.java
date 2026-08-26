package com.sih.gig.service;

import com.sih.gig.dto.request.SendOtpRequest;
import com.sih.gig.dto.request.VerifyOtpRequest;
import com.sih.gig.entity.User;
import com.sih.gig.entity.Worker;
import com.sih.gig.exception.ApiException;
import com.sih.gig.repository.UserRepository;
import com.sih.gig.repository.WorkerRepository;
import com.sih.gig.security.JwtUtil;
import com.sih.gig.security.OtpHashUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

// ─────────────────────────────────────────────────────────────────────────────
// DEV NOTE: OTP sessions are stored in-memory (ConcurrentHashMap) because Redis
// is not installed on this machine. This is fine for development/demo.
//
// TO SWITCH BACK TO REDIS (production-ready):
//  1. Install Redis or use Upstash (https://upstash.com) and set REDIS_HOST/PORT.
//  2. Re-add: private final RedisTemplate<String, String> redisTemplate;
//  3. Replace the otpStore.put() calls with redisTemplate.opsForValue().set(...)
//  4. Replace the otpStore.get() calls with redisTemplate.opsForValue().get(...)
//  5. Replace the otpStore.remove() calls with redisTemplate.delete(...)
// ─────────────────────────────────────────────────────────────────────────────

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final WorkerRepository workerRepository;
    private final OtpHashUtil otpHashUtil;
    private final JwtUtil jwtUtil;
    private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    @Value("${app.otp.expiry-seconds}")
    private long otpExpirySeconds;

    // In-memory OTP store: sessionId -> [otpHash, phone, expiryEpochSecond]
    private final ConcurrentHashMap<String, String[]> otpStore = new ConcurrentHashMap<>();

    /**
     * POST /api/v1/auth/send-otp
     * Generates OTP, hashes it, stores in memory keyed by session_id.
     */
    @Transactional
    public Map<String, String> sendOtp(SendOtpRequest req) {
        // Upsert user
        userRepository.findByPhone(req.getPhone()).orElseGet(() -> {
            User newUser = User.builder()
                    .phone(req.getPhone())
                    .role(req.getRole())
                    .build();
            User saved = userRepository.save(newUser);
            // If worker role, create worker record
            if ("WORKER".equals(req.getRole())) {
                Worker worker = Worker.builder().user(saved).build();
                workerRepository.save(worker);
            }
            return saved;
        });

        String otp       = otpHashUtil.generateOtp();
        String otpHash   = otpHashUtil.hashOtp(otp);
        String sessionId = "sess_" + UUID.randomUUID().toString().replace("-", "").substring(0, 10);
        long   expiry    = Instant.now().getEpochSecond() + otpExpirySeconds;

        // Store in memory: [otpHash, phone, expiryTimestamp]
        otpStore.put(sessionId, new String[]{otpHash, req.getPhone(), String.valueOf(expiry)});

        // In production: dispatch OTP via SMS gateway (e.g. Exotel/Twilio)
        // For dev/demo, log it clearly so you can copy it:
        log.info("====================================================");
        log.info("📱 OTP for {} → {}  (session: {})", req.getPhone(), otp, sessionId);
        log.info("====================================================");

        return Map.of(
                "message",    "OTP sent successfully",
                "session_id", sessionId,
                "dev_otp",    otp   // DEV ONLY — remove before production / when SMS gateway is live
        );
    }

    /**
     * POST /api/v1/auth/verify-otp
     * Validates OTP hash from memory store, issues JWT.
     */
    public Map<String, Object> verifyOtp(VerifyOtpRequest req) {
        String[] entry = otpStore.get(req.getSessionId());

        if (entry == null) {
            throw ApiException.badRequest("OTP expired or session not found");
        }

        String storedHash  = entry[0];
        String storedPhone = entry[1];
        long   expiry      = Long.parseLong(entry[2]);

        // Check expiry
        if (Instant.now().getEpochSecond() > expiry) {
            otpStore.remove(req.getSessionId());
            throw ApiException.badRequest("OTP has expired");
        }

        if (!storedPhone.equals(req.getPhone())) {
            throw ApiException.badRequest("Phone number does not match session");
        }
        if (!otpHashUtil.verifyOtp(req.getOtp(), storedHash)) {
            throw ApiException.unauthorized("Invalid OTP");
        }

        // Consume OTP (delete from store)
        otpStore.remove(req.getSessionId());

        User user = userRepository.findByPhone(req.getPhone())
                .orElseThrow(() -> ApiException.notFound("User not found"));

        String token = jwtUtil.generateToken(user.getId(), user.getPhone(), user.getRole());

        return Map.of(
                "token", token,
                "user",  Map.of(
                        "id",   user.getId().toString(),
                        "role", user.getRole(),
                        "name", user.getName() != null ? user.getName() : ""
                )
        );
    }

    /**
     * Admin login using email and password
     */
    @Transactional
    public Map<String, Object> adminLogin(String email, String password) {
        User admin = userRepository.findByEmail(email)
                .orElseThrow(() -> ApiException.unauthorized("Invalid admin credentials"));

        if (admin.getPassword() == null || !passwordEncoder.matches(password, admin.getPassword())) {
            throw ApiException.unauthorized("Invalid admin credentials");
        }

        if (!"ADMIN".equals(admin.getRole())) {
            throw ApiException.unauthorized("Unauthorized role");
        }

        String token = jwtUtil.generateToken(admin.getId(), admin.getPhone(), admin.getRole());
        return Map.of(
                "token", token,
                "user",  Map.of(
                        "id",   admin.getId().toString(),
                        "role", admin.getRole(),
                        "name", admin.getName() != null ? admin.getName() : ""
                )
        );
    }
}
