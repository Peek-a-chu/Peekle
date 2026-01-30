package com.peekle.global.media.service;

import io.openvidu.java.client.*;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.net.ssl.*;
import java.security.cert.X509Certificate;
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
        // 개발 환경용: SSL 인증서 검증 무시 (자체 서명 인증서 사용 시 필요)
        disableSslVerification();

        this.openVidu = new OpenVidu(openViduUrl, openViduSecret);
        log.info("Connecting to OpenVidu at {}", openViduUrl);
    }

    /**
     * SSL 인증서 무시 설정 (개발용)
     * CA 인증서가 없는 OpenVidu 서버(localhost 등) 접속 시 SSL 에러 방지
     */
    private void disableSslVerification() {
        try {
            TrustManager[] trustAllCerts = new TrustManager[] {
                    new X509TrustManager() {
                        public X509Certificate[] getAcceptedIssuers() {
                            return null;
                        }

                        public void checkClientTrusted(X509Certificate[] certs, String authType) {
                        }

                        public void checkServerTrusted(X509Certificate[] certs, String authType) {
                        }
                    }
            };

            SSLContext sc = SSLContext.getInstance("SSL");
            sc.init(null, trustAllCerts, new java.security.SecureRandom());
            HttpsURLConnection.setDefaultSSLSocketFactory(sc.getSocketFactory());

            // 호스트네임 검증 무시
            HostnameVerifier allHostsValid = (hostname, session) -> true;
            HttpsURLConnection.setDefaultHostnameVerifier(allHostsValid);

            log.warn("⚠️ SSL Verification has been disabled. Do NOT use this in production!");
        } catch (Exception e) {
            log.error("Failed to disable SSL verification", e);
        }
    }

    /**
     * 세션 ID(스터디 ID 등)를 받아 활성 세션이 있으면 반환, 없으면 생성합니다.
     * 
     * @param customSessionId "study_{id}" 등의 고유 식별자
     * @return OpenVidu Session ID
     */
    public String getOrCreateSession(String customSessionId) throws OpenViduJavaClientException, OpenViduHttpException {
        // 1. 활성 세션 목록 조회
        try {
            openVidu.fetch();
        } catch (OpenViduJavaClientException e) {
            // 연결 실패 시 더 명확한 로그 남기기
            log.error("Failed to fetch OpenVidu sessions. Check URL/Secret or SSL settings. URL: {}", openViduUrl);
            throw e;
        }

        for (Session session : openVidu.getActiveSessions()) {
            if (session.getSessionId().equals(customSessionId)) {
                log.info("Found existing session: {}", customSessionId);
                return session.getSessionId();
            }
        }

        // 2. 세션 생성
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

    /**
     * 특정 스터디에서 특정 유저를 강제로 연결 해제시킵니다.
     */
    public void evictUser(Long studyId, Long userId) {
        String sessionId = "study_" + studyId;
        try {
            openVidu.fetch();
            Session session = openVidu.getActiveSessions().stream()
                    .filter(s -> s.getSessionId().equals(sessionId))
                    .findFirst()
                    .orElse(null);

            if (session != null) {
                for (Connection connection : session.getConnections()) {
                    // clientData에서 userId 확인
                    // 예: {"userId":123} or "userId=123"
                    String clientData = connection.getClientData();
                    if (clientData != null && clientData.contains(String.valueOf(userId))) {
                        log.info("Force disconnecting user {} from OpenVidu session {}", userId, sessionId);
                        try {
                            session.forceDisconnect(connection);
                        } catch (OpenViduJavaClientException | OpenViduHttpException e) {
                            log.warn("Failed to force disconnect connection {} for user {}",
                                    connection.getConnectionId(), userId);
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.error("Error during evictUser", e);
        }
    }
}
