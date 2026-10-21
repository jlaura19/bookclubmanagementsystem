package com.usiu.bookclub.controller;

import java.util.Map;
import java.util.regex.Pattern;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.usiu.bookclub.entity.User;
import com.usiu.bookclub.repository.UserRepository;

import jakarta.servlet.http.HttpSession;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(originPatterns = {"http://localhost:*", "http://127.0.0.1:*", "http://10.*:*", "http://172.16.*:*", "http://172.17.*:*", "http://172.18.*:*", "http://172.19.*:*", "http://172.20.*:*", "http://172.21.*:*", "http://172.22.*:*", "http://172.23.*:*", "http://172.24.*:*", "http://172.25.*:*", "http://172.26.*:*", "http://172.27.*:*", "http://172.28.*:*", "http://172.29.*:*", "http://172.30.*:*", "http://172.31.*:*", "http://192.168.*:*"}, allowCredentials = "true")
public class AuthController {

    private static final String SESSION_USER_ID = "USERNAME";
    private static final Pattern USERNAME_PATTERN = Pattern.compile("^[a-zA-Z0-9._-]{3,64}$");
    private final UserRepository userRepository;

    public AuthController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @PostMapping("/signup")
    public ResponseEntity<?> signUp(@RequestBody(required = false) LoginRequest loginRequest, HttpSession session) {
        String normalizedUsername = normalizeUsername(loginRequest);
        if (normalizedUsername == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Username is required."));
        }

        if (!USERNAME_PATTERN.matcher(normalizedUsername).matches()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Username must be 3-64 chars and can include letters, numbers, ., _, -."));
        }

        if (userRepository.existsById(normalizedUsername)) {
            return ResponseEntity.status(409).body(Map.of("message", "This username is already registered. Please sign in."));
        }

        User user = new User();
        user.setUsername(normalizedUsername);
        user = userRepository.save(user);

        session.setAttribute(SESSION_USER_ID, user.getUsername());
        return ResponseEntity.ok(user);
    }

    @PostMapping("/signin")
    public ResponseEntity<?> signIn(@RequestBody(required = false) LoginRequest loginRequest, HttpSession session) {
        String normalizedUsername = normalizeUsername(loginRequest);
        if (normalizedUsername == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Username is required."));
        }

        if (!USERNAME_PATTERN.matcher(normalizedUsername).matches()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Please enter a valid username."));
        }

        User user = userRepository.findById(normalizedUsername).orElse(null);
        if (user == null) {
            return ResponseEntity.status(404).body(Map.of("message", "No account found. Please sign up first."));
        }

        session.setAttribute(SESSION_USER_ID, user.getUsername());
        return ResponseEntity.ok(user);
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody(required = false) LoginRequest loginRequest, HttpSession session) {
        String normalizedUsername = normalizeUsername(loginRequest);
        if (normalizedUsername == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Username is required."));
        }

        if (!USERNAME_PATTERN.matcher(normalizedUsername).matches()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Please enter a valid username."));
        }

        User user = userRepository.findById(normalizedUsername)
                .orElseGet(() -> {
                    User newUser = new User();
                    newUser.setUsername(normalizedUsername);
                    return userRepository.save(newUser);
                });

        session.setAttribute(SESSION_USER_ID, user.getUsername());
        return ResponseEntity.ok(user);
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpSession session) {
        session.invalidate();
        return ResponseEntity.ok().build();
    }

    @GetMapping("/me")
    public ResponseEntity<User> me(HttpSession session) {
        String username = (String) session.getAttribute(SESSION_USER_ID);
        if (username == null) {
            return ResponseEntity.status(401).build();
        }
        return userRepository.findById(username)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.status(401).build());
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> handleException(Exception ex) {
        return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
    }

    private String normalizeUsername(LoginRequest loginRequest) {
        String username = loginRequest == null ? null : loginRequest.username();
        if (username == null || username.isBlank()) {
            return null;
        }

        return username.trim();
    }
}
