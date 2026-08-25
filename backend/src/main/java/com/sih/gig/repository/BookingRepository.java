package com.sih.gig.repository;

import com.sih.gig.entity.Booking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface BookingRepository extends JpaRepository<Booking, UUID> {

    List<Booking> findByCustomerId(UUID customerId);

    List<Booking> findByWorkerId(UUID workerId);

    @Query("SELECT b FROM Booking b " +
           "LEFT JOIN FETCH b.customer " +
           "LEFT JOIN FETCH b.worker w " +
           "LEFT JOIN FETCH w.user " +
           "WHERE b.id = :id")
    Optional<Booking> findByIdWithDetails(@Param("id") UUID id);

    List<Booking> findByStatus(String status);
}
