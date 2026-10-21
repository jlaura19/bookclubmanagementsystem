package com.usiu.bookclub.repository;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.usiu.bookclub.entity.Meeting;

public interface MeetingRepository extends JpaRepository<Meeting, Long> {

    List<Meeting> findByStartsAtAfterOrderByStartsAtAsc(LocalDateTime after);

    List<Meeting> findTop20ByCreatedAtAfterOrderByCreatedAtDesc(LocalDateTime after);
}
