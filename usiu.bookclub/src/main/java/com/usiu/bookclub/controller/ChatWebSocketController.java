package com.usiu.bookclub.controller;

import java.util.Map;
import java.util.Optional;

import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import com.usiu.bookclub.entity.Book;
import com.usiu.bookclub.entity.ChatMessage;
import com.usiu.bookclub.entity.User;
import com.usiu.bookclub.repository.BookRepository;
import com.usiu.bookclub.repository.ChatMessageRepository;
import com.usiu.bookclub.repository.UserRepository;
import com.usiu.bookclub.service.ChatReactionService;

@Controller
public class ChatWebSocketController {

    private static final String SESSION_USER_ID = "USERNAME";

    private final ChatMessageRepository chatMessageRepository;
    private final BookRepository bookRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final ChatReactionService chatReactionService;

    public ChatWebSocketController(ChatMessageRepository chatMessageRepository, BookRepository bookRepository,
            UserRepository userRepository, SimpMessagingTemplate messagingTemplate,
            ChatReactionService chatReactionService) {
        this.chatMessageRepository = chatMessageRepository;
        this.bookRepository = bookRepository;
        this.userRepository = userRepository;
        this.messagingTemplate = messagingTemplate;
        this.chatReactionService = chatReactionService;
    }

    @MessageMapping("/chat.send")
    public void sendMessage(ChatMessageRequest request, SimpMessageHeaderAccessor headerAccessor) {
        String username = getUsername(headerAccessor);
        if (username == null) {
            return;
        }

        User user = userRepository.findById(username).orElse(null);
        if (user == null) {
            return;
        }

        String message = request == null || request.message() == null ? "" : request.message().trim();
        if (message.isBlank()) {
            return;
        }

        Book threadBook = null;
        if (request != null && request.bookId() != null) {
            Optional<Book> maybeBook = bookRepository.findById(request.bookId());
            if (maybeBook.isEmpty()) {
                return;
            }
            threadBook = maybeBook.get();
        }

        ChatMessage chatMessage = ChatMessage.builder()
                .message(message)
                .book(threadBook)
                .user(user)
                .build();

        ChatMessage saved = chatMessageRepository.save(chatMessage);
        ChatMessageView view = ChatMessageView.fromEntity(saved);
        messagingTemplate.convertAndSend(resolveThreadTopic(view.bookId()), view);
    }

    @MessageMapping("/chat.react")
    public void reactToMessage(Map<String, Object> payload, SimpMessageHeaderAccessor headerAccessor) {
        String username = getUsername(headerAccessor);
        if (username == null || payload == null || !(payload.get("messageId") instanceof Number messageId)
                || !(payload.get("emoji") instanceof String emoji)) {
            return;
        }

        User user = userRepository.findById(username).orElse(null);
        if (user == null) {
            return;
        }

        ChatMessageView view = chatReactionService.toggle(messageId.longValue(), user, emoji);
        if (view != null) {
            messagingTemplate.convertAndSend(resolveThreadTopic(view.bookId()), view);
        }
    }

    private String getUsername(SimpMessageHeaderAccessor headerAccessor) {
        Map<String, Object> sessionAttributes = headerAccessor.getSessionAttributes();
        if (sessionAttributes == null) {
            return null;
        }

        Object value = sessionAttributes.get(SESSION_USER_ID);
        if (value instanceof String username) {
            return username;
        }
        return null;
    }

    private String resolveThreadTopic(Long bookId) {
        if (bookId == null) {
            return "/topic/chat.general";
        }
        return "/topic/chat.book." + bookId;
    }
}
