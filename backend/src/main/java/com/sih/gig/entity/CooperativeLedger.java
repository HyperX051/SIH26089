package com.sih.gig.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "cooperative_ledger")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CooperativeLedger {

    @Id
    @Column(name = "society_id", length = 60)
    private String societyId;

    @Column(name = "gross_turnover", precision = 15, scale = 2)
    private BigDecimal grossTurnover = BigDecimal.ZERO;

    @Column(name = "commission_rate", precision = 6, scale = 4)
    private BigDecimal commissionRate = BigDecimal.valueOf(0.05);

    @Column(name = "commission_reserve", precision = 15, scale = 2)
    private BigDecimal commissionReserve = BigDecimal.ZERO;

    @Column(name = "dividend_pool_balance", precision = 15, scale = 2)
    private BigDecimal dividendPoolBalance = BigDecimal.ZERO;

    @Column(name = "eligible_worker_count")
    private Integer eligibleWorkerCount = 0;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    @PreUpdate
    @PrePersist
    public void touch() {
        this.updatedAt = OffsetDateTime.now();
    }
}
