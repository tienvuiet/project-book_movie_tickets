package com.cinemabooking.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class CloudinaryService {
    private final Cloudinary cloudinary;

    public String uploadImage(MultipartFile file, String folder) {
        if (file == null || file.isEmpty()) return null;
        if (file.getContentType() == null || !file.getContentType().startsWith("image/")) {
            throw new IllegalArgumentException("Tệp tải lên phải là hình ảnh");
        }
        try {
            Map<?, ?> result = cloudinary.uploader().upload(file.getBytes(),
                    ObjectUtils.asMap("folder", folder, "resource_type", "image"));
            return (String) result.get("secure_url");
        } catch (IOException exception) {
            var reason = exception.getMessage();
            throw new IllegalStateException(
                    "Không thể tải ảnh lên Cloudinary" +
                            (reason == null || reason.isBlank() ? "" : ": " + reason),
                    exception);
        }
    }
}
