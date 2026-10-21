package com.usiu.bookclub.service;

import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.usiu.bookclub.controller.ChatMessageView;
import com.usiu.bookclub.controller.ChatMessageView.ReactionView;
import com.usiu.bookclub.entity.ChatMessage;
import com.usiu.bookclub.entity.ChatReaction;
import com.usiu.bookclub.entity.User;
import com.usiu.bookclub.repository.ChatMessageRepository;
import com.usiu.bookclub.repository.ChatReactionRepository;

@Service
public class ChatReactionService {

    public static final Set<String> ALLOWED_EMOJIS = Set.of("👍", "❤️", "😂", "😮", "😢", "🔥", "👏", "📚");

    private final ChatReactionRepository reactionRepository;
    private final ChatMessageRepository messageRepository;

    public ChatReactionService(ChatReactionRepository reactionRepository, ChatMessageRepository messageRepository) {
        this.reactionRepository = reactionRepository;
        this.messageRepository = messageRepository;
    }

    @Transactional(readOnly = true)
    public ChatMessageView toView(ChatMessage message) {
        return ChatMessageView.fromEntity(message, groupReactions(reactionRepository.findByMessageId(message.getId())));
    }

    @Transactional(readOnly = true)
    public List<ChatMessageView> toViews(List<ChatMessage> messages) {
        if (messages.isEmpty()) {
            return List.of();
        }
        List<Long> ids = messages.stream().map(ChatMessage::getId).toList();
        Map<Long, List<ChatReaction>> byMessage = reactionRepository.findByMessageIdIn(ids).stream()
                .collect(Collectors.groupingBy(reaction -> reaction.getMessage().getId()));
        return messages.stream()
                .map(message -> ChatMessageView.fromEntity(message,
                        groupReactions(byMessage.getOrDefault(message.getId(), List.of()))))
                .toList();
    }

    /** Toggles the user's reaction; returns null when the message or emoji is invalid. */
    @Transactional
    public ChatMessageView toggle(Long messageId, User user, String emoji) {
        if (messageId == null || emoji == null || !ALLOWED_EMOJIS.contains(emoji)) {
            return null;
        }
        ChatMessage message = messageRepository.findById(messageId).orElse(null);
        if (message == null) {
            return null;
        }
        var existing = reactionRepository.findByMessageIdAndUserUsernameAndEmoji(messageId, user.getUsername(), emoji);
        if (existing.isPresent()) {
            reactionRepository.delete(existing.get());
        } else {
            reactionRepository.save(ChatReaction.builder().message(message).user(user).emoji(emoji).build());
        }
        reactionRepository.flush();
        return toView(message);
    }

    private List<ReactionView> groupReactions(Collection<ChatReaction> reactions) {
        Map<String, List<String>> grouped = new LinkedHashMap<>();
        for (ChatReaction reaction : reactions) {
            grouped.computeIfAbsent(reaction.getEmoji(), key -> new java.util.ArrayList<>())
                    .add(reaction.getUser().getUsername());
        }
        return grouped.entrySet().stream()
                .map(entry -> new ReactionView(entry.getKey(), entry.getValue()))
                .toList();
    }
}
