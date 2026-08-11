package com.usiu.bookclub.controller;

import com.fasterxml.jackson.annotation.JsonAlias;

public record LoginRequest(@JsonAlias("studentId")
        String username) {

}
