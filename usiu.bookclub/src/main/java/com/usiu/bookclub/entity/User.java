package com.usiu.bookclub.entity;

import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;

import com.fasterxml.jackson.annotation.JsonIgnore;

import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    @Column(name = "username", nullable = false, length = 64)
    private String username;

    @Column(name = "full_name", length = 255)
    private String fullName;

    @Column(length = 64)
    private String displayName;

    @Column(length = 300)
    private String bio;

    @Column(length = 300)
    private String avatarUrl;

    @Column(length = 300)
    private String favoriteGenres;

    private Integer readingGoal;

    @Column(length = 10)
    private String themePreference;

    private Boolean notifyMeetings;

    private Boolean notifyMessages;

    private Boolean notifyReactions;

    private Boolean showAvatars;

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore
    private List<Book> books = new ArrayList<>();

    public String getThemePreference() {
        return themePreference == null ? "LIGHT" : themePreference;
    }

    public Integer getReadingGoal() {
        return readingGoal == null ? 0 : readingGoal;
    }

    public Boolean getNotifyMeetings() {
        return notifyMeetings == null || notifyMeetings;
    }

    public Boolean getNotifyMessages() {
        return notifyMessages == null || notifyMessages;
    }

    public Boolean getNotifyReactions() {
        return notifyReactions == null || notifyReactions;
    }

    public Boolean getShowAvatars() {
        return showAvatars == null || showAvatars;
    }
}
