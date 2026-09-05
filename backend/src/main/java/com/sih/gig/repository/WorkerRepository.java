package com.sih.gig.repository;

import com.sih.gig.entity.Worker;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface WorkerRepository extends JpaRepository<Worker, UUID> {

    Optional<Worker> findByUserId(UUID userId);

    List<Worker> findByApprovalStatus(String approvalStatus);

    long countByIsAvailableTrue();
    List<Worker> findByIsAvailableTrue();

    /**
     * PostGIS ST_DWithin geo-spatial dispatch query.
     * Finds available workers whose location is within their own service_radius_km
     * AND also within the customer-requested radius from the booking location.
     * Results are ordered by distance (nearest first).
     *
     * @param lat    booking latitude
     * @param lng    booking longitude
     * @param radiusM max search radius in metres (e.g. 20000 for 20 km)
     */
    @Query(value = """
        SELECT w.* FROM workers w
        WHERE w.is_available = TRUE
          AND w.latitude IS NOT NULL
          AND w.longitude IS NOT NULL
          AND ST_DWithin(
                ST_SetSRID(ST_MakePoint(w.longitude, w.latitude), 4326)::geography,
                ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
                LEAST(w.service_radius_km * 1000, :radiusM)
              )
        ORDER BY ST_Distance(
                ST_SetSRID(ST_MakePoint(w.longitude, w.latitude), 4326)::geography,
                ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography
              ) ASC
        LIMIT 10
        """, nativeQuery = true)
    List<Worker> findNearbyAvailableWorkers(
            @Param("lat") double lat,
            @Param("lng") double lng,
            @Param("radiusM") double radiusM
    );

    @Query(value = """
        SELECT w.* FROM workers w
        WHERE w.is_available = TRUE
          AND w.service_pincode = :pincode
          AND w.latitude IS NOT NULL
          AND w.longitude IS NOT NULL
          AND ST_DWithin(
                ST_SetSRID(ST_MakePoint(w.longitude, w.latitude), 4326)::geography,
                ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
                LEAST(w.service_radius_km * 1000, :radiusM)
              )
        ORDER BY ST_Distance(
                ST_SetSRID(ST_MakePoint(w.longitude, w.latitude), 4326)::geography,
                ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography
              ) ASC
        LIMIT 10
        """, nativeQuery = true)
    List<Worker> findNearbyAvailableWorkersInPincode(
            @Param("lat") double lat,
            @Param("lng") double lng,
            @Param("radiusM") double radiusM,
            @Param("pincode") String pincode
    );
}
