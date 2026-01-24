package com.peekle.global.media.service;

import io.openvidu.java.client.*;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class MediaService {

    @Value("${OPENVIDU_URL}")
    private String openViduUrl;

    @Value("${OPENVIDU_SECRET}")
    private String openViduSecret;

    private OpenVidu openVidu;

    @PostConstruct
    public void init() {
        this.openVidu = new OpenVidu(openViduUrl, openViduSecret);
        log.info("Connecting to OpenVidu at {}", openViduUrl);
    }

    /**
     * 세션 ID(스터디 ID 등)를 받아 활성 세션이 있으면 반환, 없으면 생성합니다.
     * 
     * @param customSessionId "study_{id}" 등의 고유 식별자
     * @return OpenVidu Session ID
     */
    public String getOrCreateSession(String customSessionId) throws OpenViduJavaClientException, OpenViduHttpException {
        // 1. 활성 세션 목록 조회
        openVidu.fetch();
        for (Session session : openVidu.getActiveSessions()) {
            if (session.getSessionId().equals(customSessionId)) {
                log.info("Found existing session: {}", customSessionId);
                return session.getSessionId();
            }
        }

        // 2. 세션 생성
        // Custom Session ID를 사용하면, OpenVidu Session ID 자체가 우리가 원하는 문자열이 됩니다.
        SessionProperties properties = new SessionProperties.Builder()
                .customSessionId(customSessionId)
                .build();

        Session session = openVidu.createSession(properties);
        log.info("Created new session: {}", session.getSessionId());
        return session.getSessionId();
    }

    /**
     * 특정 세션에 대한 연결 토큰을 생성합니다.
     * 
     * @param sessionId OpenVidu Session ID
     * @param userData  사용자 메타데이터 (JSON String 등)
     * @return Connection Token
     */
    public String createConnection(String sessionId, Map<String, Object> userData)
            throws OpenViduJavaClientException, OpenViduHttpException {
        openVidu.fetch();
        Session session = openVidu.getActiveSessions().stream()
                .filter(s -> s.getSessionId().equals(sessionId))
                .findFirst()
                .orElse(null);

        if (session == null) {
            log.warn("Session {} not found active. Re-creating...", sessionId);
            return getOrCreateSession(sessionId);
        }

        ConnectionProperties properties = new ConnectionProperties.Builder()
                .type(ConnectionType.WEBRTC)
                .data(userData != null ? userData.toString() : "")
                .role(OpenViduRole.PUBLISHER)
                .build();

        Connection connection = session.createConnection(properties);
        log.info("Created connection token for session {}", sessionId);
        return connection.getToken();
    }
}
