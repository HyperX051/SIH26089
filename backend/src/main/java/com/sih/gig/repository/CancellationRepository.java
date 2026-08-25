package com.sih.gig.repository;

import com.sih.gig.entity.Cancellation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface CancellationRepository extends JpaRepository<Cancellation, UUID> {
}
