package com.usiu.bookclub.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.usiu.bookclub.entity.MeetingRsvp;

public interface MeetingRsvpRepository extends JpaRepository<MeetingRsvp, Long> {

    List<MeetingRsvp> findByMeetingIdIn(Collection<Long> meetingIds);

    Optional<MeetingRsvp> findByMeetingIdAndUserUsername(Long meetingId, String username);

    void deleteByMeetingId(Long meetingId);
}
