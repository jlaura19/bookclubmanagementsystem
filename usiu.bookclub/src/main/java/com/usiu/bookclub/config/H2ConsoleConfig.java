package com.usiu.bookclub.config;

import jakarta.servlet.Servlet;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.web.servlet.ServletRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConditionalOnProperty(prefix = "spring.h2.console", name = "enabled", havingValue = "true")
public class H2ConsoleConfig {

    @Bean
    public ServletRegistrationBean<Servlet> h2ConsoleServlet(
            @Value("${spring.h2.console.path:/h2-console}") String h2ConsolePath) {
        String normalizedPath = h2ConsolePath.endsWith("/")
                ? h2ConsolePath.substring(0, h2ConsolePath.length() - 1)
                : h2ConsolePath;
        String mapping = normalizedPath + "/*";

        Servlet servlet;
        try {
            Class<?> servletClass = Class.forName("org.h2.server.web.JakartaWebServlet");
            servlet = (Servlet) servletClass.getDeclaredConstructor().newInstance();
        } catch (ReflectiveOperationException ex) {
            throw new IllegalStateException("Failed to create H2 console servlet", ex);
        }

        ServletRegistrationBean<Servlet> registrationBean = new ServletRegistrationBean<>(servlet, mapping);
        registrationBean.setName("h2Console");
        return registrationBean;
    }
}
