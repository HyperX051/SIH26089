package com.sih.gig.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "bookings")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Booking {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private User customer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "worker_id")
    private Worker worker;

    @Column(name = "service_type", nullable = false, length = 30)
    private String serviceType;

    @Column(name = "category_type", nullable = false, length = 20)
    private String categoryType = "PREDEFINED";

    @Column(name = "custom_prompt_text", columnDefinition = "TEXT")
    private String customPromptText;

    @Column(name = "booking_type", nullable = false, length = 20)
    private String bookingType = "INSTANT";

    @Column(nullable = false, length = 30)
    private String status = "SEARCHING";

    @Column(name = "base_wage", precision = 10, scale = 2)
    private BigDecimal baseWage = BigDecimal.ZERO;

    @Column(name = "material_cost", precision = 10, scale = 2)
    private BigDecimal materialCost = BigDecimal.ZERO;

    @Column(name = "otp_hash", length = 255)
    private String otpHash;

    @Column(name = "otp_code", length = 6)
    private String otpCode;

    @Column(name = "scheduled_for")
    private OffsetDateTime scheduledFor;

    @Column(nullable = false, precision = 11, scale = 7)
    private BigDecimal latitude;

    @Column(nullable = false, precision = 11, scale = 7)
    private BigDecimal longitude;

    @Column(nullable = false, length = 10)
    private String pincode;

    @Column(name = "address_text", nullable = false, columnDefinition = "TEXT")
    private String addressText;

    @Column(name = "issue_photo_url")
    private String issuePhotoUrl;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    @Column(name = "accepted_at")
    private OffsetDateTime acceptedAt;

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = OffsetDateTime.now();
    }
}
