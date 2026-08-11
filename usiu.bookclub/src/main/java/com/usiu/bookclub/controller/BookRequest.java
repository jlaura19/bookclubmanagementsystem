package com.usiu.bookclub.controller;

public record BookRequest(
        String title,
        String author,
        String genre,
        String readingStatus,
        Integer rating,
        String reviewNotes
) {
}
