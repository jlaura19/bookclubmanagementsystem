package com.usiu.bookclub.controller;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.usiu.bookclub.repository.ChatMessageRepository;
import com.usiu.bookclub.repository.ChatReactionRepository;
import com.usiu.bookclub.repository.MeetingRepository;

import jakarta.servlet.http.HttpSession;

@RestController
@RequestMapping("/api/notifications")
@CrossOrigin(originPatterns = {"http://localhost:*", "http://127.0.0.1:*", "http://10.*:*", "http://172.16.*:*", "http://192.168.*:*"}, allowCredentials = "true")
public class NotificationController {

    private static final String SESSION_USER_ID = "USERNAME";

    public record NotificationView(String id, String type, String text, String createdAt, String link) {
    }

    private final MeetingRepository meetingRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final ChatReactionRepository reactionRepository;

    public NotificationController(MeetingRepository meetingRepository, ChatMessageRepository chatMessageRepository,
            ChatReactionRepository reactionRepository) {
        this.meetingRepository = meetingRepository;
        this.chatMessageRepository = chatMessageRepository;
        this.reactionRepository = reactionRepository;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<?> recent(HttpSession session) {
        String username = (String) session.getAttribute(SESSION_USER_ID);
        if (username == null) {
            return ResponseEntity.status(401).build();
        }

        LocalDateTime since = LocalDateTime.now().minusDays(7);
        List<NotificationView> items = new ArrayList<>();

        meetingRepository.findTop20ByCreatedAtAfterOrderByCreatedAtDesc(since).stream()
                .filter(meeting -> !meeting.getOrganizer().getUsername().equals(username))
                .forEach(meeting -> items.add(new NotificationView("meeting-" + meeting.getId(), "meeting",
                        meeting.getOrganizer().getUsername() + " scheduled “" + meeting.getTitle() + "”",
                        meeting.getCreatedAt().toString(), "/dashboard#schedule")));

        chatMessageRepository.findTop20ByUserUsernameNotAndCreatedAtAfterOrderByCreatedAtDesc(username, since)
                .forEach(message -> items.add(new NotificationView("message-" + message.getId(), "message",
                        message.getUser().getUsername() + ": " + abbreviate(message.getMessage()),
                        message.getCreatedAt().toString(), "/chat")));

        reactionRepository
                .findTop20ByMessageUserUsernameAndUserUsernameNotAndCreatedAtAfterOrderByCreatedAtDesc(username, username, since)
                .forEach(reaction -> items.add(new NotificationView("reaction-" + reaction.getId(), "reaction",
                        reaction.getUser().getUsername() + " reacted " + reaction.getEmoji() + " to your message",
                        reaction.getCreatedAt().toString(), "/chat")));

        items.sort(Comparator.comparing(NotificationView::createdAt).reversed());
        return ResponseEntity.ok(items.stream().limit(30).toList());
    }

    private String abbreviate(String text) {
        return text.length() > 80 ? text.substring(0, 77) + "…" : text;
    }
}
