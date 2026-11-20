package com.cinemabooking.controller;

import com.cinemabooking.dto.response.ApiResponse;
import com.cinemabooking.exception.BusinessException;
import com.cinemabooking.exception.ErrorCode;
import com.cinemabooking.service.CloudinaryService;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/uploads")
public class PromotionImageUploadController {
    private static final Set<String> ALLOWED_IMAGE_TYPES = Set.of(
            MediaType.IMAGE_JPEG_VALUE,
            MediaType.IMAGE_PNG_VALUE,
            "image/webp"
    );

    private final CloudinaryService cloudinaryService;

    public PromotionImageUploadController(CloudinaryService cloudinaryService) {
        this.cloudinaryService = cloudinaryService;
    }

    @PostMapping(value = "/promotions", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<Map<String, String>> uploadPromotionImage(
            @RequestPart("image") MultipartFile image) {
        if (image.isEmpty()) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "Vui lòng chọn ảnh khuyến mãi");
        }
        if (image.getContentType() == null || !ALLOWED_IMAGE_TYPES.contains(image.getContentType())) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "Chỉ chấp nhận ảnh JPG, PNG hoặc WebP");
        }

        var imageUrl = cloudinaryService.uploadImage(image, "cinema-booking/promotions");
        return ApiResponse.success("Tải ảnh khuyến mãi thành công", Map.of("imageUrl", imageUrl));
    }
}
