package com.usiu.bookclub.controller;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.usiu.bookclub.entity.Book;
import com.usiu.bookclub.entity.ChatMessage;
import com.usiu.bookclub.entity.Meeting;
import com.usiu.bookclub.entity.User;
import com.usiu.bookclub.repository.BookRepository;
import com.usiu.bookclub.repository.ChatMessageRepository;
import com.usiu.bookclub.repository.ChatReactionRepository;
import com.usiu.bookclub.repository.MeetingRepository;
import com.usiu.bookclub.repository.MeetingRsvpRepository;
import com.usiu.bookclub.repository.ReviewRepository;
import com.usiu.bookclub.repository.UserRepository;
import com.usiu.bookclub.service.FileStorageService;

import jakarta.servlet.http.HttpSession;

@RestController
@RequestMapping("/api/profile")
@CrossOrigin(originPatterns = {"http://localhost:*", "http://127.0.0.1:*", "http://10.*:*", "http://172.16.*:*", "http://192.168.*:*"}, allowCredentials = "true")
public class ProfileController {

    private static final String SESSION_USER_ID = "USERNAME";
    private static final Set<String> THEMES = Set.of("LIGHT", "DARK", "SYSTEM");
    private static final Pattern GENRES_PATTERN = Pattern.compile("^[\\p{L}\\p{N} &,'/-]*$");

    public record ProfileRequest(String displayName, String bio, String favoriteGenres, Integer readingGoal,
            String themePreference, Boolean notifyMeetings, Boolean notifyMessages, Boolean notifyReactions,
            Boolean showAvatars) {
    }

    private final UserRepository userRepository;
    private final FileStorageService fileStorageService;
    private final BookRepository bookRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final ChatReactionRepository reactionRepository;
    private final MeetingRepository meetingRepository;
    private final MeetingRsvpRepository rsvpRepository;
    private final ReviewRepository reviewRepository;

    public ProfileController(UserRepository userRepository, FileStorageService fileStorageService,
            BookRepository bookRepository, ChatMessageRepository chatMessageRepository,
            ChatReactionRepository reactionRepository, MeetingRepository meetingRepository,
            MeetingRsvpRepository rsvpRepository, ReviewRepository reviewRepository) {
        this.userRepository = userRepository;
        this.fileStorageService = fileStorageService;
        this.bookRepository = bookRepository;
        this.chatMessageRepository = chatMessageRepository;
        this.reactionRepository = reactionRepository;
        this.meetingRepository = meetingRepository;
        this.rsvpRepository = rsvpRepository;
        this.reviewRepository = reviewRepository;
    }

    @GetMapping
    public ResponseEntity<?> get(HttpSession session) {
        User user = currentUser(session);
        return user == null ? ResponseEntity.status(401).build() : ResponseEntity.ok(user);
    }

    @PutMapping
    @Transactional
    public ResponseEntity<?> update(@RequestBody(required = false) ProfileRequest request, HttpSession session) {
        User user = currentUser(session);
        if (user == null) {
            return ResponseEntity.status(401).build();
        }
        if (request == null) {
            return error("Nothing to update.");
        }

        if (request.displayName() != null) {
            String name = request.displayName().trim();
            if (name.length() > 64) {
                return error("Display name must be 64 characters or fewer.");
            }
            user.setDisplayName(name.isEmpty() ? null : name);
        }
        if (request.bio() != null) {
            String bio = request.bio().trim();
            if (bio.length() > 300) {
                return error("Bio must be 300 characters or fewer.");
            }
            user.setBio(bio.isEmpty() ? null : bio);
        }
        if (request.favoriteGenres() != null) {
            String genres = request.favoriteGenres().trim();
            if (genres.length() > 300 || !GENRES_PATTERN.matcher(genres).matches()) {
                return error("Favourite genres contain unsupported characters or are too long.");
            }
            user.setFavoriteGenres(genres.isEmpty() ? null : genres);
        }
        if (request.readingGoal() != null) {
            if (request.readingGoal() < 0 || request.readingGoal() > 500) {
                return error("Reading goal must be between 0 and 500.");
            }
            user.setReadingGoal(request.readingGoal());
        }
        if (request.themePreference() != null) {
            String theme = request.themePreference().toUpperCase();
            if (!THEMES.contains(theme)) {
                return error("Theme must be LIGHT, DARK or SYSTEM.");
            }
            user.setThemePreference(theme);
        }
        if (request.notifyMeetings() != null) {
            user.setNotifyMeetings(request.notifyMeetings());
        }
        if (request.notifyMessages() != null) {
            user.setNotifyMessages(request.notifyMessages());
        }
        if (request.notifyReactions() != null) {
            user.setNotifyReactions(request.notifyReactions());
        }
        if (request.showAvatars() != null) {
            user.setShowAvatars(request.showAvatars());
        }
        return ResponseEntity.ok(userRepository.save(user));
    }

    @PostMapping(path = "/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Transactional
    public ResponseEntity<?> uploadAvatar(@RequestParam("avatar") MultipartFile avatar, HttpSession session)
            throws IOException {
        User user = currentUser(session);
        if (user == null) {
            return ResponseEntity.status(401).build();
        }
        if (avatar == null || avatar.isEmpty()) {
            return error("Please choose an image.");
        }
        String newUrl;
        try {
            newUrl = fileStorageService.storeAvatar(avatar);
        } catch (IllegalArgumentException ex) {
            return error(ex.getMessage());
        }
        fileStorageService.deleteCoverImage(user.getAvatarUrl());
        user.setAvatarUrl(newUrl);
        return ResponseEntity.ok(userRepository.save(user));
    }

    @DeleteMapping("/avatar")
    @Transactional
    public ResponseEntity<?> removeAvatar(HttpSession session) {
        User user = currentUser(session);
        if (user == null) {
            return ResponseEntity.status(401).build();
        }
        fileStorageService.deleteCoverImage(user.getAvatarUrl());
        user.setAvatarUrl(null);
        return ResponseEntity.ok(userRepository.save(user));
    }

    @DeleteMapping
    @Transactional
    public ResponseEntity<?> deleteAccount(@RequestParam(required = false) String confirm, HttpSession session) {
        User user = currentUser(session);
        if (user == null) {
            return ResponseEntity.status(401).build();
        }
        if (confirm == null || !confirm.equals(user.getUsername())) {
            return error("Type your username to confirm account deletion.");
        }
        String username = user.getUsername();

        List<ChatMessage> messages = chatMessageRepository.findByUserUsernameOrBookUserUsername(username, username);
        messages.forEach(message -> reactionRepository.deleteAll(reactionRepository.findByMessageId(message.getId())));
        reactionRepository.deleteAll(reactionRepository.findByUserUsername(username));
        chatMessageRepository.deleteAll(messages);

        for (Meeting meeting : meetingRepository.findByOrganizerUsername(username)) {
            rsvpRepository.deleteByMeetingId(meeting.getId());
            meetingRepository.delete(meeting);
        }
        rsvpRepository.deleteAll(rsvpRepository.findByUserUsername(username));

        reviewRepository.deleteAll(reviewRepository.findByUserUsernameOrBookUserUsername(username, username));

        for (Book book : bookRepository.findByUserUsername(username)) {
            fileStorageService.deleteCoverImage(book.getCoverImageUrl());
        }
        fileStorageService.deleteCoverImage(user.getAvatarUrl());
        userRepository.delete(user);
        userRepository.flush();
        session.invalidate();
        return ResponseEntity.ok().build();
    }

    private ResponseEntity<?> error(String message) {
        return ResponseEntity.badRequest().body(Map.of("message", message));
    }

    private User currentUser(HttpSession session) {
        String username = (String) session.getAttribute(SESSION_USER_ID);
        return username == null ? null : userRepository.findById(username).orElse(null);
    }
}
