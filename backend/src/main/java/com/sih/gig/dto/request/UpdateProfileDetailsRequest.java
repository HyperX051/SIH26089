package com.sih.gig.dto.request;

import java.math.BigDecimal;
import lombok.Data;

@Data
public class UpdateProfileDetailsRequest {
    private String upiId;
    private Boolean itiCertified;
    private String tier;
    private BigDecimal latitude;
    private BigDecimal longitude;
    private String servicePincode;
}
