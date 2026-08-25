package com.sih.gig.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "cancellations")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Cancellation {

    @Id
    @Column(name = "booking_id")
    private UUID bookingId;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "booking_id")
    private Booking booking;

    @Column(columnDefinition = "TEXT")
    private String reason;

    @Column(name = "cancelled_by", length = 20)
    private String cancelledBy;

    @Column(precision = 10, scale = 2)
    private BigDecimal fee = BigDecimal.ZERO;

    @Column(name = "worker_payout", precision = 10, scale = 2)
    private BigDecimal workerPayout = BigDecimal.ZERO;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;
}
