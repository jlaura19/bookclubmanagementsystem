package com.usiu.bookclub.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.usiu.bookclub.entity.ChatMessage;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    List<ChatMessage> findTop100ByBookIsNullOrderByCreatedAtDesc();

    List<ChatMessage> findTop100ByBookIdOrderByCreatedAtDesc(Long bookId);

    List<ChatMessage> findTop20ByUserUsernameNotAndCreatedAtAfterOrderByCreatedAtDesc(
            String username, java.time.LocalDateTime after);
}
