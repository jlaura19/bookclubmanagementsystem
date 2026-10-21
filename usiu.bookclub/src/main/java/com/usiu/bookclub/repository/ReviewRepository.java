package com.usiu.bookclub.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.usiu.bookclub.entity.Review;

public interface ReviewRepository extends JpaRepository<Review, Long> {

    List<Review> findByBookIdOrderByCreatedAtDesc(Long bookId);

    List<Review> findByUserUsernameOrBookUserUsername(String reviewer, String bookOwner);
}
