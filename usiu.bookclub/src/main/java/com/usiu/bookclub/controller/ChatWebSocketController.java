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

@Controller
public class ChatWebSocketController {

    private static final String SESSION_USER_ID = "USERNAME";

    private final ChatMessageRepository chatMessageRepository;
    private final BookRepository bookRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public ChatWebSocketController(ChatMessageRepository chatMessageRepository, BookRepository bookRepository,
            UserRepository userRepository, SimpMessagingTemplate messagingTemplate) {
        this.chatMessageRepository = chatMessageRepository;
        this.bookRepository = bookRepository;
        this.userRepository = userRepository;
        this.messagingTemplate = messagingTemplate;
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

    @MessageMapping("/chat.upvote")
    public void upvoteMessage(Map<String, Long> payload, SimpMessageHeaderAccessor headerAccessor) {
        String username = getUsername(headerAccessor);
        if (username == null) {
            return;
        }

        if (payload == null || payload.get("messageId") == null) {
            return;
        }

        ChatMessage message = chatMessageRepository.findById(payload.get("messageId")).orElse(null);
        if (message == null) {
            return;
        }

        Integer currentVoteCount = message.getUpvotes();
        int currentVotes = currentVoteCount == null ? 0 : currentVoteCount;
        message.setUpvotes(currentVotes + 1);
        ChatMessage saved = chatMessageRepository.save(message);
        ChatMessageView view = ChatMessageView.fromEntity(saved);
        messagingTemplate.convertAndSend(resolveThreadTopic(view.bookId()), view);
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
