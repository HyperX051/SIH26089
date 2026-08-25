package com.sih.gig.repository;

import com.sih.gig.entity.CooperativeLedger;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CooperativeLedgerRepository extends JpaRepository<CooperativeLedger, String> {
}
