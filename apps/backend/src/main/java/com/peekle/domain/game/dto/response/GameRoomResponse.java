package com.peekle.domain.game.dto.response;

import com.peekle.domain.game.enums.GameMode;
import com.peekle.domain.game.enums.GameStatus;
import com.peekle.domain.game.enums.GameType;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class GameRoomResponse {
    private Long roomId;
    private String title;
    @JsonProperty("isSecret")
    private boolean isSecret;
    private GameStatus status;
    private Integer currentPlayers;
    private Integer maxPlayers;
    private Integer timeLimit;
    private Integer problemCount;
    private GameType teamType;
    private GameMode mode;
    private HostInfo host;
    private java.util.List<String> tags;
    private java.util.List<ParticipantInfo> participants;
    private String tierMin;
    private String tierMax;
    private String workbookTitle; // 문제집 제목 (문제집인 경우)
    private java.util.List<ProblemInfo> problems;

    @Getter
    @Builder
    public static class HostInfo {
        private Long id;
        private String nickname;
        private String profileImg;
    }

    @Getter
    @Builder
    public static class ProblemInfo {
        private Long id;
        private String externalId;
        private String title;
        private String tier;
        private String url;
    }

    @Getter
    @Builder
    public static class ParticipantInfo {
        private Long id;
        private String nickname;
        private String profileImg;
        private boolean isHost;
        private boolean isReady;
        private String team;
    }
}
