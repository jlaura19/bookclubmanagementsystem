package com.usiu.bookclub.controller;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.usiu.bookclub.entity.Book;
import com.usiu.bookclub.entity.ChatMessage;
import com.usiu.bookclub.entity.User;
import com.usiu.bookclub.repository.BookRepository;
import com.usiu.bookclub.repository.ChatMessageRepository;
import com.usiu.bookclub.repository.UserRepository;
import com.usiu.bookclub.service.ChatReactionService;

import jakarta.servlet.http.HttpSession;

@RestController
@RequestMapping("/api/chat")
@CrossOrigin(originPatterns = {"http://localhost:*", "http://127.0.0.1:*", "http://10.*:*", "http://172.16.*:*", "http://172.17.*:*", "http://172.18.*:*", "http://172.19.*:*", "http://172.20.*:*", "http://172.21.*:*", "http://172.22.*:*", "http://172.23.*:*", "http://172.24.*:*", "http://172.25.*:*", "http://172.26.*:*", "http://172.27.*:*", "http://172.28.*:*", "http://172.29.*:*", "http://172.30.*:*", "http://172.31.*:*", "http://192.168.*:*"}, allowCredentials = "true")
public class ChatController {

    private static final String SESSION_USER_ID = "USERNAME";
    private final ChatMessageRepository chatMessageRepository;
    private final BookRepository bookRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final ChatReactionService chatReactionService;

    public ChatController(ChatMessageRepository chatMessageRepository, BookRepository bookRepository,
            UserRepository userRepository, SimpMessagingTemplate messagingTemplate,
            ChatReactionService chatReactionService) {
        this.chatMessageRepository = chatMessageRepository;
        this.bookRepository = bookRepository;
        this.userRepository = userRepository;
        this.messagingTemplate = messagingTemplate;
        this.chatReactionService = chatReactionService;
    }

    @GetMapping
    public ResponseEntity<?> listMessages(@RequestParam(required = false) Long bookId, HttpSession session) {
        User user = getAuthenticatedUser(session);
        if (user == null) {
            return ResponseEntity.status(401).build();
        }

        List<ChatMessage> messageEntities;
        if (bookId == null) {
            messageEntities = chatMessageRepository.findTop100ByBookIsNullOrderByCreatedAtDesc();
        } else {
            if (bookRepository.findById(bookId).isEmpty()) {
                return ResponseEntity.notFound().build();
            }
            messageEntities = chatMessageRepository.findTop100ByBookIdOrderByCreatedAtDesc(bookId);
        }

        List<ChatMessageView> messages = chatReactionService.toViews(messageEntities);
        return ResponseEntity.ok(messages);
    }

    @PostMapping
    public ResponseEntity<?> createMessage(@RequestBody(required = false) ChatMessageRequest request, HttpSession session) {
        User user = getAuthenticatedUser(session);
        if (user == null) {
            return ResponseEntity.status(401).build();
        }

        String message = request == null || request.message() == null ? "" : request.message().trim();
        if (message.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Message cannot be empty."));
        }

        Book threadBook = null;
        if (request != null && request.bookId() != null) {
            Optional<Book> maybeBook = bookRepository.findById(request.bookId());
            if (maybeBook.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("message", "Selected book thread does not exist."));
            }
            threadBook = maybeBook.get();
        }

        ChatMessage chatMessage = ChatMessage.builder()
                .message(message)
                .user(user)
                .book(threadBook)
                .build();

        ChatMessage saved = chatMessageRepository.save(chatMessage);
        ChatMessageView view = ChatMessageView.fromEntity(saved);
        messagingTemplate.convertAndSend(resolveThreadTopic(view.bookId()), view);
        return ResponseEntity.ok(view);
    }

    @PostMapping("/{messageId}/react")
    public ResponseEntity<?> reactToMessage(@PathVariable Long messageId, @RequestBody(required = false) Map<String, String> payload,
            HttpSession session) {
        User user = getAuthenticatedUser(session);
        if (user == null) {
            return ResponseEntity.status(401).build();
        }

        ChatMessageView view = chatReactionService.toggle(messageId, user, payload == null ? null : payload.get("emoji"));
        if (view == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid message or reaction."));
        }
        messagingTemplate.convertAndSend(resolveThreadTopic(view.bookId()), view);
        return ResponseEntity.ok(view);
    }

    private User getAuthenticatedUser(HttpSession session) {
        String username = (String) session.getAttribute(SESSION_USER_ID);
        if (username == null) {
            return null;
        }
        return userRepository.findById(username).orElse(null);
    }

    private String resolveThreadTopic(Long bookId) {
        if (bookId == null) {
            return "/topic/chat.general";
        }
        return "/topic/chat.book." + bookId;
    }
}
