package com.sih.gig.repository;

import com.sih.gig.entity.SosAlert;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface SosAlertRepository extends JpaRepository<SosAlert, UUID> {

    List<SosAlert> findByStatus(String status);

    List<SosAlert> findByBookingId(UUID bookingId);

    List<SosAlert> findByUserId(UUID userId);
}
