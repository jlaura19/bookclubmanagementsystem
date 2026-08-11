package com.usiu.bookclub.controller;

import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.annotation.JsonProperty;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.usiu.bookclub.entity.Book;
import com.usiu.bookclub.entity.Review;
import com.usiu.bookclub.entity.User;
import com.usiu.bookclub.repository.BookRepository;
import com.usiu.bookclub.repository.ReviewRepository;
import com.usiu.bookclub.repository.UserRepository;

import jakarta.servlet.http.HttpSession;

@RestController
@RequestMapping("/api/books/{bookId}/reviews")
@CrossOrigin(originPatterns = {"http://localhost:*", "http://127.0.0.1:*", "http://10.*:*", "http://172.16.*:*", "http://172.17.*:*", "http://172.18.*:*", "http://172.19.*:*", "http://172.20.*:*", "http://172.21.*:*", "http://172.22.*:*", "http://172.23.*:*", "http://172.24.*:*", "http://172.25.*:*", "http://172.26.*:*", "http://172.27.*:*", "http://172.28.*:*", "http://172.29.*:*", "http://172.30.*:*", "http://172.31.*:*", "http://192.168.*:*"}, allowCredentials = "true")
public class ReviewController {

    private static final String SESSION_USER_ID = "USERNAME";
    private final ReviewRepository reviewRepository;
    private final BookRepository bookRepository;
    private final UserRepository userRepository;

    public ReviewController(ReviewRepository reviewRepository, BookRepository bookRepository, UserRepository userRepository) {
        this.reviewRepository = reviewRepository;
        this.bookRepository = bookRepository;
        this.userRepository = userRepository;
    }

    @GetMapping
    public ResponseEntity<?> listReviews(@PathVariable Long bookId, HttpSession session) {
        User user = getAuthenticatedUser(session);
        if (user == null) {
            return ResponseEntity.status(401).build();
        }

        if (bookRepository.findById(bookId).isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        List<ReviewView> reviews = reviewRepository.findByBookIdOrderByCreatedAtDesc(bookId).stream()
                .map(ReviewView::fromEntity)
                .toList();
        return ResponseEntity.ok(reviews);
    }

    @PostMapping
    public ResponseEntity<?> createReview(@PathVariable Long bookId,
            @RequestBody(required = false) ReviewRequest request,
            HttpSession session) {
        User user = getAuthenticatedUser(session);
        if (user == null) {
            return ResponseEntity.status(401).build();
        }

        Book book = bookRepository.findById(bookId).orElse(null);
        if (book == null) {
            return ResponseEntity.notFound().build();
        }

        if (request == null || request.rating() == null || request.rating() < 0 || request.rating() > 5) {
            return ResponseEntity.badRequest().body(Map.of("message", "Rating must be between 0 and 5."));
        }

        String readingStatus = request.readingStatus() == null || request.readingStatus().isBlank()
                ? "Completed"
                : request.readingStatus().trim();
        String comment = request.comment() == null ? "" : request.comment().trim();

        if (comment.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Please enter a review comment."));
        }

        Review review = Review.builder()
                .book(book)
                .user(user)
                .rating(request.rating())
                .readingStatus(readingStatus)
                .comment(comment)
                .build();

        Review saved = reviewRepository.save(review);
        return ResponseEntity.ok(ReviewView.fromEntity(saved));
    }

    @PostMapping("/{reviewId}/upvote")
    public ResponseEntity<?> upvoteReview(@PathVariable Long bookId, @PathVariable Long reviewId, HttpSession session) {
        User user = getAuthenticatedUser(session);
        if (user == null) {
            return ResponseEntity.status(401).build();
        }

        if (bookRepository.findById(bookId).isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Review review = reviewRepository.findById(reviewId).orElse(null);
        if (review == null || !review.getBook().getId().equals(bookId)) {
            return ResponseEntity.notFound().build();
        }

        Integer currentVoteCount = review.getUpvotes();
        int currentVotes = currentVoteCount == null ? 0 : currentVoteCount;
        review.setUpvotes(currentVotes + 1);
        Review saved = reviewRepository.save(review);
        return ResponseEntity.ok(ReviewView.fromEntity(saved));
    }

    private User getAuthenticatedUser(HttpSession session) {
        String username = (String) session.getAttribute(SESSION_USER_ID);
        if (username == null) {
            return null;
        }
        return userRepository.findById(username).orElse(null);
    }

    private record ReviewView(Long id, String reviewerUsername, Integer rating, String readingStatus, String comment,
            String createdAt, Integer upvotes) {

        @JsonProperty("reviewerStudentId")
        public String getLegacyReviewerStudentId() {
            return reviewerUsername;
        }

        static ReviewView fromEntity(Review review) {
            return new ReviewView(
                    review.getId(),
                    review.getUser().getUsername(),
                    review.getRating(),
                    review.getReadingStatus(),
                    review.getComment(),
                    review.getCreatedAt() == null ? null : review.getCreatedAt().toString(),
                    review.getUpvotes());
        }
    }
}
