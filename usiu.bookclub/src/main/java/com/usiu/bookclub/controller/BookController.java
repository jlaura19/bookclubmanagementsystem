package com.usiu.bookclub.controller;

import java.io.IOException;
import java.util.List;
import java.util.Optional;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.usiu.bookclub.entity.Book;
import com.usiu.bookclub.entity.User;
import com.usiu.bookclub.repository.BookRepository;
import com.usiu.bookclub.repository.UserRepository;
import com.usiu.bookclub.service.FileStorageService;

import jakarta.servlet.http.HttpSession;

@RestController
@RequestMapping("/api/books")
@CrossOrigin(originPatterns = {"http://localhost:*", "http://127.0.0.1:*", "http://10.*:*", "http://172.16.*:*", "http://172.17.*:*", "http://172.18.*:*", "http://172.19.*:*", "http://172.20.*:*", "http://172.21.*:*", "http://172.22.*:*", "http://172.23.*:*", "http://172.24.*:*", "http://172.25.*:*", "http://172.26.*:*", "http://172.27.*:*", "http://172.28.*:*", "http://172.29.*:*", "http://172.30.*:*", "http://172.31.*:*", "http://192.168.*:*"}, allowCredentials = "true")
public class BookController {

    private static final String SESSION_USER_ID = "USERNAME";
    private final BookRepository bookRepository;
    private final UserRepository userRepository;
    private final FileStorageService fileStorageService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public BookController(BookRepository bookRepository, UserRepository userRepository,
            FileStorageService fileStorageService) {
        this.bookRepository = bookRepository;
        this.userRepository = userRepository;
        this.fileStorageService = fileStorageService;
    }

    @GetMapping
    public ResponseEntity<List<Book>> listBooks(HttpSession session) {
        User user = getAuthenticatedUser(session);
        if (user == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(bookRepository.findAllByOrderByIdDesc());
    }

    @GetMapping("/mine")
    public ResponseEntity<List<Book>> listMyBooks(HttpSession session) {
        User user = getAuthenticatedUser(session);
        if (user == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(bookRepository.findByUserUsername(user.getUsername()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Book> getBook(@PathVariable Long id, HttpSession session) {
        User user = getAuthenticatedUser(session);
        if (user == null) {
            return ResponseEntity.status(401).build();
        }
        return bookRepository.findById(id).map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Book> createBook(@RequestPart("book") String requestJson,
            @RequestPart(value = "coverImage", required = false) MultipartFile coverImage, HttpSession session)
            throws IOException {
        User user = getAuthenticatedUser(session);
        if (user == null) {
            return ResponseEntity.status(401).build();
        }

        BookRequest request = parseBookRequest(requestJson);
        Book book = buildBookFromRequest(request);
        book.setUser(user);
        if (coverImage != null && !coverImage.isEmpty()) {
            book.setCoverImageUrl(fileStorageService.storeCoverImage(coverImage));
        }

        return ResponseEntity.ok(bookRepository.save(book));
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Book> createBookJson(@RequestBody BookRequest request, HttpSession session) {
        User user = getAuthenticatedUser(session);
        if (user == null) {
            return ResponseEntity.status(401).build();
        }

        Book book = buildBookFromRequest(request);
        book.setUser(user);
        return ResponseEntity.ok(bookRepository.save(book));
    }

    @PutMapping(path = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Book> updateBook(@PathVariable Long id,
            @RequestPart("book") String requestJson,
            @RequestPart(value = "coverImage", required = false) MultipartFile coverImage,
            HttpSession session) throws IOException {
        User user = getAuthenticatedUser(session);
        if (user == null) {
            return ResponseEntity.status(401).build();
        }

        BookRequest request = parseBookRequest(requestJson);
        Optional<Book> existing = bookRepository.findById(id);
        if (existing.isEmpty() || !existing.get().getUser().getUsername().equals(user.getUsername())) {
            return ResponseEntity.notFound().build();
        }

        Book book = existing.get();
        updateBookFromRequest(book, request);

        if (coverImage != null && !coverImage.isEmpty()) {
            fileStorageService.deleteCoverImage(book.getCoverImageUrl());
            book.setCoverImageUrl(fileStorageService.storeCoverImage(coverImage));
        }

        return ResponseEntity.ok(bookRepository.save(book));
    }

    @PutMapping(path = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Book> updateBookJson(@PathVariable Long id, @RequestBody BookRequest request, HttpSession session) {
        User user = getAuthenticatedUser(session);
        if (user == null) {
            return ResponseEntity.status(401).build();
        }

        Optional<Book> existing = bookRepository.findById(id);
        if (existing.isEmpty() || !existing.get().getUser().getUsername().equals(user.getUsername())) {
            return ResponseEntity.notFound().build();
        }

        Book book = existing.get();
        updateBookFromRequest(book, request);
        return ResponseEntity.ok(bookRepository.save(book));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteBook(@PathVariable Long id, HttpSession session) {
        User user = getAuthenticatedUser(session);
        if (user == null) {
            return ResponseEntity.status(401).build();
        }

        return bookRepository.findById(id)
                .filter(book -> book.getUser().getUsername().equals(user.getUsername()))
                .map(book -> {
                    fileStorageService.deleteCoverImage(book.getCoverImageUrl());
                    bookRepository.delete(book);
                    return ResponseEntity.ok().<Void>build();
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    private BookRequest parseBookRequest(String requestJson) throws JsonProcessingException {
        return objectMapper.readValue(requestJson, BookRequest.class);
    }

    private Book buildBookFromRequest(BookRequest request) {
        return Book.builder()
                .title(request.title())
                .author(request.author())
                .genre(request.genre())
                .readingStatus(request.readingStatus())
                .rating(request.rating())
                .reviewNotes(request.reviewNotes())
                .build();
    }

    private void updateBookFromRequest(Book book, BookRequest request) {
        book.setTitle(request.title());
        book.setAuthor(request.author());
        book.setGenre(request.genre());
        book.setReadingStatus(request.readingStatus());
        book.setRating(request.rating());
        book.setReviewNotes(request.reviewNotes());
    }

    private User getAuthenticatedUser(HttpSession session) {
        String username = (String) session.getAttribute(SESSION_USER_ID);
        if (username == null) {
            return null;
        }
        return userRepository.findById(username).orElse(null);
    }
}
