package com.peekle.domain.user.enums;

public enum UserRole {
    USER,
    ADMIN;

    public boolean isAdmin() {
        return this == ADMIN;
    }
}
