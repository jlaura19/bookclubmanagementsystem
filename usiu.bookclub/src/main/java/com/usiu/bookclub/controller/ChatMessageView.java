package com.usiu.bookclub.controller;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.usiu.bookclub.entity.ChatMessage;

public record ChatMessageView(Long id, String username, String message, String createdAt, Long bookId, Integer upvotes) {

    @JsonProperty("studentId")
    public String getLegacyStudentId() {
        return username;
    }

    static ChatMessageView fromEntity(ChatMessage chatMessage) {
        return new ChatMessageView(
                chatMessage.getId(),
                chatMessage.getUser().getUsername(),
                chatMessage.getMessage(),
                chatMessage.getCreatedAt() == null ? null : chatMessage.getCreatedAt().toString(),
                chatMessage.getBook() == null ? null : chatMessage.getBook().getId(),
                chatMessage.getUpvotes());
    }
}
