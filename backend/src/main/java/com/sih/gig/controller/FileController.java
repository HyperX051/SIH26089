package com.sih.gig.controller;

import com.sih.gig.dto.response.ApiResponse;
import com.sih.gig.service.FileStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/files")
@RequiredArgsConstructor
public class FileController {

    private final FileStorageService fileStorageService;

    /** POST /api/v1/files/upload */
    @PostMapping("/upload")
    public ResponseEntity<ApiResponse<?>> uploadFile(@RequestParam("file") MultipartFile file) {
        String url = fileStorageService.storeFile(file);
        if (url == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("UPLOAD_FAILED", "Failed to upload file"));
        }
        return ResponseEntity.ok(ApiResponse.ok(Map.of("url", url)));
    }
}
