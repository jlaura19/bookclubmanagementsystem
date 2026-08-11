package com.usiu.bookclub.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.usiu.bookclub.entity.Book;

public interface BookRepository extends JpaRepository<Book, Long> {

    List<Book> findByUserUsername(String username);

    List<Book> findAllByOrderByIdDesc();
}
