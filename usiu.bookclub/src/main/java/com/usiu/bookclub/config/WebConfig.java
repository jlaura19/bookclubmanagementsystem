package com.usiu.bookclub.config;

import java.nio.file.Path;
import java.nio.file.Paths;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Value("${app.upload.dir:uploads/covers}")
    private String uploadDir;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        Path uploadPath = Paths.get(uploadDir).toAbsolutePath().normalize();
        Path uploadParentPath = uploadPath.getParent() == null ? uploadPath : uploadPath.getParent();

        // Resource handler locations should be explicit directories (trailing slash)
        // so both legacy and current URL styles resolve consistently.
        String resourceLocation = asDirectoryResourceLocation(uploadPath);
        String legacyResourceLocation = asDirectoryResourceLocation(uploadParentPath);

        registry.addResourceHandler("/uploads/covers/**")
                .addResourceLocations(resourceLocation, legacyResourceLocation)
                .setCachePeriod(3600);
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations(resourceLocation)
                .setCachePeriod(3600);
    }

    private String asDirectoryResourceLocation(Path path) {
        String location = path.toUri().toString();
        return location.endsWith("/") ? location : location + "/";
    }
}
