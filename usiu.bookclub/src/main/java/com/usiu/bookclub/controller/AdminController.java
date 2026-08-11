package com.usiu.bookclub.controller;

import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.usiu.bookclub.entity.Book;
import com.usiu.bookclub.entity.User;
import com.usiu.bookclub.repository.BookRepository;
import com.usiu.bookclub.repository.UserRepository;

import jakarta.servlet.http.HttpSession;

@RestController
@RequestMapping("/api/admin")
@CrossOrigin(originPatterns = {"http://localhost:*", "http://127.0.0.1:*", "http://10.*:*", "http://172.16.*:*", "http://172.17.*:*", "http://172.18.*:*", "http://172.19.*:*", "http://172.20.*:*", "http://172.21.*:*", "http://172.22.*:*", "http://172.23.*:*", "http://172.24.*:*", "http://172.25.*:*", "http://172.26.*:*", "http://172.27.*:*", "http://172.28.*:*", "http://172.29.*:*", "http://172.30.*:*", "http://172.31.*:*", "http://192.168.*:*"}, allowCredentials = "true")
public class AdminController {

    private static final String SESSION_USER_ID = "USERNAME";

    private final UserRepository userRepository;
    private final BookRepository bookRepository;

    public AdminController(UserRepository userRepository, BookRepository bookRepository) {
        this.userRepository = userRepository;
        this.bookRepository = bookRepository;
    }

    @GetMapping("/users")
    public ResponseEntity<List<User>> listUsers(HttpSession session) {
        if (!isAuthenticated(session)) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(userRepository.findAll());
    }

    @GetMapping("/books")
    public ResponseEntity<List<Book>> listBooks(HttpSession session) {
        if (!isAuthenticated(session)) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(bookRepository.findAllByOrderByIdDesc());
    }

    @GetMapping("/overview")
    public ResponseEntity<Map<String, Object>> overview(HttpSession session) {
        if (!isAuthenticated(session)) {
            return ResponseEntity.status(401).build();
        }

        List<User> users = userRepository.findAll();
        List<Book> books = bookRepository.findAllByOrderByIdDesc();
        return ResponseEntity.ok(Map.of(
                "userCount", users.size(),
                "bookCount", books.size(),
                "users", users,
                "books", books));
    }

    private boolean isAuthenticated(HttpSession session) {
        String username = (String) session.getAttribute(SESSION_USER_ID);
        if (username == null) {
            return false;
        }
        return userRepository.existsById(username);
    }
}
