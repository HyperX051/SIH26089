package com.sih.gig;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.data.redis.RedisAutoConfiguration;
import org.springframework.boot.autoconfigure.data.redis.RedisRepositoriesAutoConfiguration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * SIH 2026 — Cooperative Gig Services Platform (PSID: 26089)
 * Main Spring Boot Application Entry Point
 *
 * NOTE: Redis auto-configuration is disabled because Redis is not installed locally.
 * OTPs are stored in-memory (ConcurrentHashMap in AuthService).
 * To re-enable Redis, remove the 'exclude' below and restore RedisTemplate in AuthService.
 */
@SpringBootApplication(exclude = {RedisAutoConfiguration.class, RedisRepositoriesAutoConfiguration.class})
@EnableAsync
@EnableScheduling
public class GigApplication {

    public static void main(String[] args) {
        SpringApplication.run(GigApplication.class, args);
    }
}
