package com.usiu.bookclub.controller;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.usiu.bookclub.entity.ChatMessage;

public record ChatMessageView(Long id, String username, String message, String createdAt, Long bookId, Integer upvotes,
        List<ReactionView> reactions) {

    public record ReactionView(String emoji, List<String> users) {
    }

    @JsonProperty("studentId")
    public String getLegacyStudentId() {
        return username;
    }

    static ChatMessageView fromEntity(ChatMessage chatMessage) {
        return fromEntity(chatMessage, List.of());
    }

    public static ChatMessageView fromEntity(ChatMessage chatMessage, List<ReactionView> reactions) {
        return new ChatMessageView(
                chatMessage.getId(),
                chatMessage.getUser().getUsername(),
                chatMessage.getMessage(),
                chatMessage.getCreatedAt() == null ? null : chatMessage.getCreatedAt().toString(),
                chatMessage.getBook() == null ? null : chatMessage.getBook().getId(),
                chatMessage.getUpvotes(),
                reactions);
    }
}
