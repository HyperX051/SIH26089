package com.sih.gig.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "workers")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Worker {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Builder.Default
    @Column(name = "service_radius_km", precision = 6, scale = 2)
    private BigDecimal serviceRadiusKm = BigDecimal.valueOf(10.0);

    @Builder.Default
    @Column(name = "is_available")
    private Boolean isAvailable = Boolean.FALSE;

    @Column(precision = 11, scale = 7)
    private BigDecimal latitude;

    @Column(precision = 11, scale = 7)
    private BigDecimal longitude;

    @Builder.Default
    @Column(name = "ncct_certified")
    private Boolean ncctCertified = Boolean.FALSE;

    @Builder.Default
    @Column(length = 20)
    private String tier = "BASIC";  // 'BASIC' | 'SKILLED' | 'EXPERT'

    @Builder.Default
    @Column(precision = 3, scale = 2)
    private BigDecimal rating = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "total_jobs")
    private Integer totalJobs = 0;

    @Column(name = "photo_url", length = 255)
    private String photoUrl;

    @Column(name = "certification_url", length = 255)
    private String certificationUrl;

    @Builder.Default
    @Column(name = "approval_status", length = 50)
    private String approvalStatus = "PENDING";

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;
}
