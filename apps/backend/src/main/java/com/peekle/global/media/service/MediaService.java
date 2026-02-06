package com.peekle.global.media.service;

import io.livekit.server.AccessToken;
import io.livekit.server.RoomJoin;
import io.livekit.server.RoomName;
import io.livekit.server.RoomServiceClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import retrofit2.Call;
import retrofit2.Response;

@Slf4j
@Service
@RequiredArgsConstructor
public class MediaService {

    private final RoomServiceClient roomServiceClient;

    @Value("${livekit.api-key}")
    private String apiKey;

    @Value("${livekit.api-secret}")
    private String secret;

    // LiveKit 접속을 위한 Access Token 생성
    public String createAccessToken(Long studyId, Long userId, String nickname) {
        String roomName = "study_" + studyId;
        // DUPLICATE_IDENTITY 방지를 위해 UUID를 결합하여 고유 Identity 생성
        String identity = userId + "_" + java.util.UUID.randomUUID().toString();
        AccessToken token = new AccessToken(apiKey, secret);
        token.setName(nickname); // 화면에 표시될 이름
        token.setIdentity(identity); // 유저 고유 ID
        token.setMetadata("{\"userId\": " + userId + "}");
        // 권한 설정: 방 참여 가능, 방 이름 지정
        token.addGrants(new RoomJoin(true), new RoomName(roomName));
        // 토큰 발급 (JWT 문자열 반환)
        return token.toJwt();
    }

    // 게임방 LiveKit 접속을 위한 Access Token 생성
    public String createGameAccessToken(Long gameId, Long userId, String nickname) {
        String roomName = "game_" + gameId;
        // DUPLICATE_IDENTITY 방지를 위해 UUID를 결합하여 고유 Identity 생성
        String identity = userId + "_" + java.util.UUID.randomUUID().toString();
        AccessToken token = new AccessToken(apiKey, secret);
        token.setName(nickname); // 화면에 표시될 이름
        token.setIdentity(identity); // 유저 고유 ID
        token.setMetadata("{\"userId\": " + userId + "}");
        // 권한 설정: 방 참여 가능, 방 이름 지정
        token.addGrants(new RoomJoin(true), new RoomName(roomName));
        // 토큰 발급 (JWT 문자열 반환)
        return token.toJwt();
    }

    // 특정 유저 강퇴 (LiveKit 서버 API 호출)
    public void evictUser(Long studyId, Long userId) {
        String roomName = "study_" + studyId;
        String identity = String.valueOf(userId);
        try {
            Call<Void> call = roomServiceClient.removeParticipant(roomName, identity);
            Response<Void> response = call.execute();
            if (response.isSuccessful()) {
                log.info("Evicted user {} from room {}", userId, roomName);
            } else {
                log.warn("Failed to evict user {}: {}", userId, response.message());
            }
        } catch (Exception e) {
            log.error("Error evicting user {}", userId, e);
        }
    }

}
