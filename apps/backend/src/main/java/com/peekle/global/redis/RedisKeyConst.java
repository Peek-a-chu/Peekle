package com.peekle.global.redis;

public class RedisKeyConst {
    // Presence (Set)
    public static final String STUDY_ONLINE_USERS = "study:%d:online_users";

    // Chat (List)
    public static final String CHAT_ROOM_LOGS = "chat:room:%d:logs";

    // Chat Topic (Pub/Sub)
    public static final String TOPIC_STUDY_CHAT = "topic/studies/rooms/%d/chat";

    // Write-Behind Buffer (List)
    public static final String CHAT_BUFFER = "chat:buffer";

    // IDE Code (Hash: study:{studyId}:problem:{problemId}:ide:{userId})
    public static final String IDE_KEY = "study:%d:problem:%d:ide:%d";

    // IDE Topic (Pub/Sub)
    public static final String TOPIC_IDE = "topic/studies/rooms/%d/ide/%d";

    // IDE Watchers (Set: study:{studyId}:ide:{targetUserId}:watchers)
    // Who is watching targetUserId? -> Set of viewerUserIds
    public static final String IDE_WATCHERS = "study:%d:ide:%d:watchers";

    // Curriculum Topic (Pub/Sub)
    public static final String TOPIC_CURRICULUM = "topic/studies/rooms/%d/problems";

    // Whiteboard Config (Hash)
    // study:{studyId}:whiteboard:config -> isActive, ownerId, status
    public static final String WHITEBOARD_CONFIG = "study:%d:whiteboard:config";

    // Whiteboard History (List)
    // study:{studyId}:whiteboard:history
    public static final String WHITEBOARD_HISTORY = "study:%d:whiteboard:history";

    // Whiteboard Topic (Pub/Sub - Broadcast)
    // /topic/studies/rooms/{studyId}/whiteboard
    public static final String TOPIC_WHITEBOARD = "topic/studies/rooms/%d/whiteboard";

    // Whiteboard Private Topic (Pub/Sub - 1:1 Sync)
    // /topic/studies/rooms/{studyId}/whiteboard/{userId}
    public static final String TOPIC_WHITEBOARD_USER = "topic/studies/rooms/%d/whiteboard/%d";

    // Game Status (Value)
    // game:room:{roomId}:status -> WAITING, PLAYING...
    public static final String GAME_STATUS = "game:room:%d:status";

    // Game Lock (Lock)
    // lock:game:room:{roomId}:status
    public static final String LOCK_GAME_STATUS = "lock:game:room:%d:status";

    // Game Topic (Pub/Sub)
    // /topic/games/rooms/{gameId}
    public static final String TOPIC_GAME_ROOM = "topic/games/rooms/%d";
}
