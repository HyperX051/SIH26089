package com.sih.gig.security;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

import java.security.SecureRandom;

@Component
public class OtpHashUtil {

    private static final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(10);
    private static final SecureRandom random = new SecureRandom();

    /** Generate a secure 6-digit OTP */
    public String generateOtp() {
        int otp = 100000 + random.nextInt(900000);
        return String.valueOf(otp);
    }

    /** BCrypt-hash an OTP for DB storage */
    public String hashOtp(String plainOtp) {
        return encoder.encode(plainOtp);
    }

    /** Verify entered OTP against stored BCrypt hash */
    public boolean verifyOtp(String plainOtp, String storedHash) {
        return encoder.matches(plainOtp, storedHash);
    }
}
