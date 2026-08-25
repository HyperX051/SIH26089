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
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final WorkerRepository workerRepository;
    private final OtpHashUtil otpHashUtil;
    private final JwtUtil jwtUtil;
    private final RedisTemplate<String, String> redisTemplate;

    @Value("${app.otp.expiry-seconds}")
    private long otpExpirySeconds;

    private static final String OTP_PREFIX  = "otp:hash:";
    private static final String SESS_PREFIX = "otp:sess:";

    /**
     * POST /api/v1/auth/send-otp
     * Generates OTP, hashes it, stores in Redis keyed by session_id.
     */
    @Transactional
    public Map<String, String> sendOtp(SendOtpRequest req) {
        // Upsert user
        User user = userRepository.findByPhone(req.getPhone()).orElseGet(() -> {
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

        // Store hash in Redis: key = otp:hash:<sessionId>, value = <hash>
        redisTemplate.opsForValue().set(OTP_PREFIX + sessionId, otpHash, otpExpirySeconds, TimeUnit.SECONDS);
        // Link session → phone
        redisTemplate.opsForValue().set(SESS_PREFIX + sessionId, req.getPhone(), otpExpirySeconds, TimeUnit.SECONDS);

        // In production: dispatch OTP via SMS gateway
        // For dev/demo, log it clearly:
        log.info("📱 OTP for {} → {} (session: {})", req.getPhone(), otp, sessionId);

        return Map.of(
                "message",    "OTP sent successfully",
                "session_id", sessionId
        );
    }

    /**
     * POST /api/v1/auth/verify-otp
     * Validates OTP hash from Redis, issues JWT.
     */
    public Map<String, Object> verifyOtp(VerifyOtpRequest req) {
        String storedHash = redisTemplate.opsForValue().get(OTP_PREFIX + req.getSessionId());
        String storedPhone = redisTemplate.opsForValue().get(SESS_PREFIX + req.getSessionId());

        if (storedHash == null || storedPhone == null) {
            throw ApiException.badRequest("OTP expired or session not found");
        }
        if (!storedPhone.equals(req.getPhone())) {
            throw ApiException.badRequest("Phone number does not match session");
        }
        if (!otpHashUtil.verifyOtp(req.getOtp(), storedHash)) {
            throw ApiException.unauthorized("Invalid OTP");
        }

        // Consume OTP (delete from Redis)
        redisTemplate.delete(OTP_PREFIX + req.getSessionId());
        redisTemplate.delete(SESS_PREFIX + req.getSessionId());

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
}
