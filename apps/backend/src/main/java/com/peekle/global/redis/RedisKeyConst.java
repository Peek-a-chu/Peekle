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

    // IDE Code (Hash: study:{studyId}:ide:{userId})
    public static final String IDE_KEY = "study:%d:ide:%d";

    // IDE Topic (Pub/Sub)
    public static final String TOPIC_IDE = "topic/studies/rooms/%d/ide/%d";

    // IDE Watchers (Set: study:{studyId}:ide:{targetUserId}:watchers)
    // Who is watching targetUserId? -> Set of viewerUserIds
    public static final String IDE_WATCHERS = "study:%d:ide:%d:watchers";

    // Curriculum Topic (Pub/Sub)
    public static final String TOPIC_CURRICULUM = "topic/studies/rooms/%d/problems";
}
