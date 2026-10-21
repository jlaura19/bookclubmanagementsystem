package com.usiu.bookclub.controller;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.usiu.bookclub.entity.Meeting;
import com.usiu.bookclub.entity.MeetingRsvp;
import com.usiu.bookclub.entity.User;
import com.usiu.bookclub.repository.MeetingRepository;
import com.usiu.bookclub.repository.MeetingRsvpRepository;
import com.usiu.bookclub.repository.UserRepository;

import jakarta.servlet.http.HttpSession;

@RestController
@RequestMapping("/api/meetings")
@CrossOrigin(originPatterns = {"http://localhost:*", "http://127.0.0.1:*", "http://10.*:*", "http://172.16.*:*", "http://192.168.*:*"}, allowCredentials = "true")
public class MeetingController {

    private static final String SESSION_USER_ID = "USERNAME";

    public record MeetingRequest(String title, String location, String notes, String startsAt) {
    }

    public record MeetingView(Long id, String title, String location, String notes, String startsAt,
            String organizer, int goingCount, boolean going, boolean mine) {
    }

    private final MeetingRepository meetingRepository;
    private final MeetingRsvpRepository rsvpRepository;
    private final UserRepository userRepository;

    public MeetingController(MeetingRepository meetingRepository, MeetingRsvpRepository rsvpRepository,
            UserRepository userRepository) {
        this.meetingRepository = meetingRepository;
        this.rsvpRepository = rsvpRepository;
        this.userRepository = userRepository;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<?> upcoming(HttpSession session) {
        User user = currentUser(session);
        if (user == null) {
            return ResponseEntity.status(401).build();
        }
        List<Meeting> meetings = meetingRepository.findByStartsAtAfterOrderByStartsAtAsc(LocalDateTime.now().minusHours(2));
        return ResponseEntity.ok(toViews(meetings, user));
    }

    @PostMapping
    @Transactional
    public ResponseEntity<?> create(@RequestBody(required = false) MeetingRequest request, HttpSession session) {
        User user = currentUser(session);
        if (user == null) {
            return ResponseEntity.status(401).build();
        }
        String title = request == null || request.title() == null ? "" : request.title().trim();
        if (title.isBlank() || title.length() > 120) {
            return error("Please enter a title (up to 120 characters).");
        }
        LocalDateTime startsAt;
        try {
            startsAt = LocalDateTime.parse(request.startsAt());
        } catch (Exception ex) {
            return error("Please choose a valid date and time.");
        }
        if (startsAt.isBefore(LocalDateTime.now())) {
            return error("The meeting must be in the future.");
        }

        Meeting saved = meetingRepository.save(Meeting.builder()
                .title(title)
                .location(trimTo(request.location(), 200))
                .notes(trimTo(request.notes(), 500))
                .startsAt(startsAt)
                .organizer(user)
                .build());
        rsvpRepository.save(MeetingRsvp.builder().meeting(saved).user(user).build());
        return ResponseEntity.ok(toViews(List.of(saved), user).get(0));
    }

    @PostMapping("/{id}/rsvp")
    @Transactional
    public ResponseEntity<?> toggleRsvp(@PathVariable Long id, HttpSession session) {
        User user = currentUser(session);
        if (user == null) {
            return ResponseEntity.status(401).build();
        }
        Meeting meeting = meetingRepository.findById(id).orElse(null);
        if (meeting == null) {
            return ResponseEntity.notFound().build();
        }
        var existing = rsvpRepository.findByMeetingIdAndUserUsername(id, user.getUsername());
        if (existing.isPresent()) {
            rsvpRepository.delete(existing.get());
        } else {
            rsvpRepository.save(MeetingRsvp.builder().meeting(meeting).user(user).build());
        }
        rsvpRepository.flush();
        return ResponseEntity.ok(toViews(List.of(meeting), user).get(0));
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<?> cancel(@PathVariable Long id, HttpSession session) {
        User user = currentUser(session);
        if (user == null) {
            return ResponseEntity.status(401).build();
        }
        return meetingRepository.findById(id)
                .filter(meeting -> meeting.getOrganizer().getUsername().equals(user.getUsername()))
                .map(meeting -> {
                    rsvpRepository.deleteByMeetingId(id);
                    meetingRepository.delete(meeting);
                    return ResponseEntity.ok().build();
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    private List<MeetingView> toViews(List<Meeting> meetings, User user) {
        if (meetings.isEmpty()) {
            return List.of();
        }
        Map<Long, Set<String>> going = rsvpRepository
                .findByMeetingIdIn(meetings.stream().map(Meeting::getId).toList()).stream()
                .collect(Collectors.groupingBy(r -> r.getMeeting().getId(),
                        Collectors.mapping(r -> r.getUser().getUsername(), Collectors.toSet())));
        return meetings.stream().map(meeting -> {
            Set<String> names = going.getOrDefault(meeting.getId(), Set.of());
            String organizer = meeting.getOrganizer().getUsername();
            return new MeetingView(meeting.getId(), meeting.getTitle(), meeting.getLocation(), meeting.getNotes(),
                    meeting.getStartsAt().toString(), organizer, names.size(),
                    names.contains(user.getUsername()), organizer.equals(user.getUsername()));
        }).toList();
    }

    private ResponseEntity<?> error(String message) {
        return ResponseEntity.badRequest().body(Map.of("message", message));
    }

    private String trimTo(String value, int max) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.length() > max ? trimmed.substring(0, max) : trimmed;
    }

    private User currentUser(HttpSession session) {
        String username = (String) session.getAttribute(SESSION_USER_ID);
        return username == null ? null : userRepository.findById(username).orElse(null);
    }
}
