package com.sih.gig.service;

import com.sih.gig.dto.request.LoginRequest;
import com.sih.gig.dto.request.RegisterRequest;
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

import org.springframework.web.multipart.MultipartFile;
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
    private final FileStorageService fileStorageService;

    @Value("${app.otp.expiry-seconds}")
    private long otpExpirySeconds;

    // In-memory OTP store: sessionId -> [otpHash, phone, expiryEpochSecond]
    private final ConcurrentHashMap<String, String[]> otpStore = new ConcurrentHashMap<>();

    @Transactional
    public Map<String, Object> register(RegisterRequest req) {
        if (userRepository.findByPhone(req.getPhone()).isPresent()) {
            throw ApiException.badRequest("Phone number is already registered.");
        }

        User newUser = User.builder()
                .phone(req.getPhone())
                .password(passwordEncoder.encode(req.getPassword()))
                .role(req.getRole())
                .build();
        User saved = userRepository.save(newUser);

        if ("WORKER".equals(req.getRole())) {
            Worker worker = Worker.builder().user(saved).build();
            workerRepository.save(worker);
        }

        String token = jwtUtil.generateToken(saved.getId(), saved.getPhone(), saved.getRole());

        return Map.of(
                "message", "Registered successfully",
                "token", token,
                "user", Map.of(
                        "id", saved.getId().toString(),
                        "role", saved.getRole(),
                        "name", ""
                )
        );
    }

    public Map<String, Object> login(LoginRequest req) {
        User user = userRepository.findByPhone(req.getPhone())
                .orElseThrow(() -> ApiException.unauthorized("Invalid phone or password"));

        if (user.getPassword() == null || !passwordEncoder.matches(req.getPassword(), user.getPassword())) {
            throw ApiException.unauthorized("Invalid phone or password");
        }

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

    /**
     * Complete profile for first-time login
     */
    @Transactional
    public Map<String, Object> completeProfile(User currentUser, String name, MultipartFile photo) {
        currentUser.setName(name);
        userRepository.save(currentUser);

        String photoUrl = null;
        if ("WORKER".equals(currentUser.getRole())) {
            Worker worker = workerRepository.findByUserId(currentUser.getId())
                    .orElseThrow(() -> ApiException.notFound("Worker profile not found"));
            
            if (photo != null && !photo.isEmpty()) {
                photoUrl = fileStorageService.storeFile(photo);
                worker.setPhotoUrl(photoUrl);
                workerRepository.save(worker);
            } else {
                photoUrl = worker.getPhotoUrl();
            }
        }

        return Map.of(
                "message", "Profile completed successfully",
                "user", Map.of(
                        "id", currentUser.getId().toString(),
                        "role", currentUser.getRole(),
                        "name", currentUser.getName() != null ? currentUser.getName() : "",
                        "photoUrl", photoUrl != null ? photoUrl : ""
                )
        );
    }
}
