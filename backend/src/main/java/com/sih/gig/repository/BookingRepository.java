package com.sih.gig.repository;

import com.sih.gig.entity.Booking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface BookingRepository extends JpaRepository<Booking, UUID> {

    List<Booking> findByCustomerId(UUID customerId);

    List<Booking> findByWorkerId(UUID workerId);

    List<Booking> findByWorkerIdAndStatus(UUID workerId, String status);

    @Query("SELECT b FROM Booking b " +
           "LEFT JOIN FETCH b.customer " +
           "LEFT JOIN FETCH b.worker w " +
           "LEFT JOIN FETCH w.user " +
           "WHERE b.id = :id")
    Optional<Booking> findByIdWithDetails(@Param("id") UUID id);

    List<Booking> findByStatus(String status);

    @Query("SELECT COALESCE(SUM(b.baseWage + b.materialCost), 0) FROM Booking b WHERE b.status = 'COMPLETED'")
    BigDecimal sumCompletedBookingTurnover();
}
