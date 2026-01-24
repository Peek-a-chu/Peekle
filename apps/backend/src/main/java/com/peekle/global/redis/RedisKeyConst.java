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
}
