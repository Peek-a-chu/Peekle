package com.peekle.global.auth.dto;

public interface OAuth2UserInfo {
    String getSocialId();
    String getProvider();
    String getNickname();
    String getProfileImage();
}
