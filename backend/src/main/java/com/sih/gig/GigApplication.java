package com.sih.gig;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * SIH 2026 — Cooperative Gig Services Platform (PSID: 26089)
 * Main Spring Boot Application Entry Point
 */
@SpringBootApplication
@EnableAsync
@EnableScheduling
public class GigApplication {

    public static void main(String[] args) {
        SpringApplication.run(GigApplication.class, args);
    }
}
