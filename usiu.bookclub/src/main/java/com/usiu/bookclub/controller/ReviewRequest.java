package com.usiu.bookclub.controller;

public record ReviewRequest(
        Integer rating,
        String readingStatus,
        String comment
        ) {

}
