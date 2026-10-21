package com.usiu.bookclub.service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

@Service
public class FileStorageService {

    private static final List<String> ALLOWED_CONTENT_TYPES = Arrays.asList("image/jpeg", "image/png", "image/gif");
    private static final long AVATAR_MAX_BYTES = 2L * 1024 * 1024;
    private static final Map<String, String> AVATAR_TYPES = Map.of(
            "image/jpeg", "jpg", "image/png", "png", "image/gif", "gif", "image/webp", "webp");
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

    public String storeAvatar(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            return null;
        }
        if (file.getSize() > AVATAR_MAX_BYTES) {
            throw new IllegalArgumentException("Profile picture must be 2MB or smaller.");
        }

        String extension = AVATAR_TYPES.get(file.getContentType());
        if (extension == null) {
            throw new IllegalArgumentException("Profile picture must be a JPEG, PNG, GIF, or WebP file.");
        }

        Path avatarDir = uploadRoot.resolve("avatars");
        Files.createDirectories(avatarDir);
        String filename = UUID.randomUUID() + "." + extension;
        Files.copy(file.getInputStream(), avatarDir.resolve(filename), StandardCopyOption.REPLACE_EXISTING);
        return "/uploads/avatars/" + filename;
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
        if (!target.startsWith(uploadRoot)) {
            return;
        }
        try {
            Files.deleteIfExists(target);
        } catch (IOException ignored) {
        }
    }

    private String normalizeUploadPath(String imageUrl) {
        String trimmed = imageUrl.trim();
        if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
            // remote (web-search) covers are never stored locally
            return null;
        }
        return trimmed;
    }
}
