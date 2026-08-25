package com.sih.gig.service;

import com.sih.gig.entity.CooperativeLedger;
import com.sih.gig.exception.ApiException;
import com.sih.gig.repository.CooperativeLedgerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final CooperativeLedgerRepository ledgerRepository;

    private static final String DEFAULT_SOCIETY = "soc_chennai_01";

    /**
     * GET /api/v1/admin/cooperative/dividend-ledger
     * Executed in SERIALIZABLE isolation to protect ledger integrity.
     */
    @Transactional(isolation = Isolation.SERIALIZABLE, readOnly = true)
    public Map<String, Object> getDividendLedger() {
        CooperativeLedger ledger = ledgerRepository.findById(DEFAULT_SOCIETY)
                .orElseThrow(() -> ApiException.notFound("Cooperative ledger not found"));

        return Map.of(
                "society_id",              ledger.getSocietyId(),
                "gross_turnover",          ledger.getGrossTurnover(),
                "commission_reserve",      ledger.getCommissionReserve(),
                "dividend_pool_balance",   ledger.getDividendPoolBalance(),
                "eligible_worker_count",   ledger.getEligibleWorkerCount()
        );
    }

    /**
     * Internal: Credit dividend pool after booking completion.
     * Executed in SERIALIZABLE isolation.
     */
    @Transactional(isolation = Isolation.SERIALIZABLE)
    public void creditDividendPool(BigDecimal bookingAmount) {
        CooperativeLedger ledger = ledgerRepository.findById(DEFAULT_SOCIETY)
                .orElseThrow(() -> ApiException.notFound("Cooperative ledger not found"));

        BigDecimal commission = bookingAmount.multiply(ledger.getCommissionRate());
        BigDecimal dividendShare = commission.multiply(BigDecimal.valueOf(0.80));

        ledger.setGrossTurnover(ledger.getGrossTurnover().add(bookingAmount));
        ledger.setCommissionReserve(ledger.getCommissionReserve().add(commission));
        ledger.setDividendPoolBalance(ledger.getDividendPoolBalance().add(dividendShare));

        ledgerRepository.save(ledger);
    }
}
