package com.usiu.bookclub.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.usiu.bookclub.entity.ChatReaction;

public interface ChatReactionRepository extends JpaRepository<ChatReaction, Long> {

    List<ChatReaction> findByMessageIdIn(Collection<Long> messageIds);

    List<ChatReaction> findByMessageId(Long messageId);

    List<ChatReaction> findByUserUsername(String username);

    Optional<ChatReaction> findByMessageIdAndUserUsernameAndEmoji(Long messageId, String username, String emoji);

    List<ChatReaction> findTop20ByMessageUserUsernameAndUserUsernameNotAndCreatedAtAfterOrderByCreatedAtDesc(
            String owner, String reactor, java.time.LocalDateTime after);
}
