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
    // /topic/games/{gameId}/room
    public static final String TOPIC_GAME_ROOM = "topic/games/%d/room";

    // Game Lobby Topic (Pub/Sub) - Global lobby broadcast
    // /topic/games/lobby
    public static final String TOPIC_GAME_LOBBY = "topic/games/lobby";

    // /sub/games/{gameId}/chat/global
    public static final String TOPIC_GAME_CHAT_GLOBAL = "topic/games/%d/chat/global";

    // /sub/games/{gameId}/chat/team/{teamColor}
    public static final String TOPIC_GAME_CHAT_TEAM = "topic/games/%d/chat/team/%s";

    // Game Room Info (Hash) -> title, password, mode, capacity...
    public static final String GAME_ROOM_INFO = "game:room:%d:info";

    // Active Game Room IDs (Set) -> 목록 조회를 위해 활성화된 방 ID들 저장
    public static final String GAME_ROOM_IDS = "game:rooms";

    // Game Room ID Generator (Atomic Long)
    public static final String GAME_ROOM_ID_SEQ = "game:room:seq";

    // Game Room Participants (Set) -> game:room:{roomId}:players
    public static final String GAME_ROOM_PLAYERS = "game:room:%d:players";

    // Game Room Ready Status (Hash) -> game:room:{roomId}:ready : {userId} ->
    // "true"/"false"
    public static final String GAME_ROOM_READY_STATUS = "game:room:%d:ready";

    // Game Room Team Info (Hash) -> game:room:{roomId}:teams : {userId} ->
    // "RED"/"BLUE"
    public static final String GAME_ROOM_TEAMS = "game:room:%d:teams";

    // Game Code (Value)
    // game:{gameId}:problem:{problemId}:user:{userId}:code
    // Changed problemId placeholder to %d
    public static final String GAME_CODE_KEY = "game:%d:problem:%d:user:%d:code";

    // Game Code Load Topic (Pub/Sub)
    // /topic/games/code/load/{userId}
    public static final String TOPIC_GAME_CODE_LOAD = "topic/games/code/load/%d";

    // 유저의 현재 게임 방 ID (Value: gameId)
    public static final String USER_CURRENT_GAME = "user:%d:game";

    // 게임 시작 시간(String) -> System.currentTimeMillis()
    public static final String GAME_START_TIME = "game:%d:start_time";

    // 문제 해결 여부 (Set) -> game:{gameId}:problem:{problemId}:solved
    public static final String GAME_SOLVED_PROBLEM = "game:%d:problem:%d:solved";

    // User Session (Value) -> user:{userId}:session -> sessionId
    public static final String USER_SESSION = "user:%d:session";

    // 실시간 랭킹(ZSet) -> game:{gameId}:ranking
    public static final String GAME_RANKING = "game:%d:ranking";

    // 팀 랭킹(ZSet) -> game:{gameId}:team_ranking (Members: "RED", "BLUE")
    public static final String GAME_TEAM_RANKING = "game:%d:team_ranking";

    // 개인 점수 기록(Hash) -> game:{gameId}:user:{userId}:score
    public static final String GAME_USER_SCORE = "game:%d:user:%d:score";

    // 토픽 (Pub/Sub)
    public static final String TOPIC_GAME_RANKING = "topic/games/%d/ranking";

    // 게임 내 문제 목록 (List) -> game:%d:problems
    public static final String GAME_PROBLEMS = "game:%d:problems";

    // 대기실용 문제 미리보기 (List) -> game:%d:problems:preview
    public static final String GAME_PROBLEMS_PREVIEW = "game:%d:problems:preview";

    // 게임 제출 예상 코드 길이 (Value) -> game:%d:problem:%d:user:%d:expected_length
    public static final String GAME_EXPECTED_LENGTH = "game:%d:problem:%d:user:%d:expected_length";

    // 게임 내 경고 알림 (Pub/Sub) -> topic/games/%d/alert/%d
    public static final String TOPIC_GAME_ALERT = "topic/games/%d/alert/%d";

    // 게임 초대 코드 (String: Code -> roomId)
    public static final String GAME_INVITE_CODE = "game:invite:code:%s";
    // 게임 방 초대 코드 (String: roomId -> Code)
    public static final String GAME_ROOM_INVITE_CODE = "game:room:invite:%d";

    // 개인전 스피드 레이스 1등 종료 타이머 시작 여부 (Value)
    public static final String GAME_FINISH_TIMER = "game:room:%d:finish_timer";

    // Game Room Broadcasted (Value) -> game:room:{roomId}:broadcasted -> "true"
    public static final String GAME_ROOM_BROADCASTED = "game:room:%d:broadcasted";

    // Game Room Reservation (Value) -> game:room:{roomId}:reservation:{userId} ->
    // "RESERVED" (TTL: 30s)
    public static final String GAME_ROOM_RESERVATION = "game:room:%d:reservation:%d";

    // Game Room Reserved Count (Value) -> game:room:{roomId}:reserved_count ->
    // counter
    public static final String GAME_ROOM_RESERVED_COUNT = "game:room:%d:reserved_count";

    // Reservation Lock (Lock)
    public static final String LOCK_GAME_RESERVE = "lock:game:reserve:%d";
    public static final String LOCK_GAME_CONFIRM = "lock:game:confirm:%d";

}
