package com.usiu.bookclub.service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.Arrays;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

@Service
public class FileStorageService {

    private static final List<String> ALLOWED_CONTENT_TYPES = Arrays.asList("image/jpeg", "image/png", "image/gif");
    private final Path uploadRoot;

    public FileStorageService(@Value("${app.upload.dir:uploads/covers}") String uploadDir) throws IOException {
        this.uploadRoot = Paths.get(uploadDir).toAbsolutePath().normalize();
        Files.createDirectories(this.uploadRoot);
    }

    public String storeCoverImage(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            return null;
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType)) {
            throw new IllegalArgumentException("Cover image must be a JPEG, PNG, or GIF file.");
        }

        String originalFilename = StringUtils.cleanPath(file.getOriginalFilename());
        String filename = System.currentTimeMillis() + "-" + originalFilename;
        Path destination = uploadRoot.resolve(filename);
        Files.copy(file.getInputStream(), destination, StandardCopyOption.REPLACE_EXISTING);
        return "/uploads/" + filename;
    }

    public void deleteCoverImage(String imageUrl) {
        if (imageUrl == null || imageUrl.isBlank()) {
            return;
        }

        String normalizedPath = normalizeUploadPath(imageUrl);
        String prefix = "/uploads/";
        if (normalizedPath == null || !normalizedPath.startsWith(prefix)) {
            return;
        }

        String filename = normalizedPath.substring(prefix.length());
        if (filename.startsWith("covers/")) {
            filename = filename.substring("covers/".length());
        }
        Path target = uploadRoot.resolve(filename).normalize();
        try {
            Files.deleteIfExists(target);
        } catch (IOException ignored) {
        }
    }

    private String normalizeUploadPath(String imageUrl) {
        String trimmed = imageUrl.trim();
        if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
            try {
                return new URI(trimmed).getPath();
            } catch (URISyntaxException ignored) {
                return null;
            }
        }
        return trimmed;
    }
}
