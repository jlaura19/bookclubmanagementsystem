package com.usiu.bookclub.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.usiu.bookclub.entity.User;

public interface UserRepository extends JpaRepository<User, String> {
}
