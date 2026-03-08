package com.peekle.domain.benchmark.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.peekle.domain.game.dto.request.GameCreateRequest;
import com.peekle.domain.game.enums.GameStatus;
import com.peekle.domain.game.service.RedisGameService;
import com.peekle.domain.game.service.WorkbookPreviewCacheService;
import com.peekle.domain.problem.entity.Problem;
import com.peekle.domain.problem.entity.Tag;
import com.peekle.domain.problem.repository.ProblemRepository;
import com.peekle.domain.user.entity.User;
import com.peekle.domain.user.repository.UserRepository;
import com.peekle.domain.workbook.entity.Workbook;
import com.peekle.domain.workbook.entity.WorkbookProblem;
import com.peekle.domain.workbook.repository.WorkbookProblemRepository;
import com.peekle.domain.workbook.repository.WorkbookRepository;
import com.peekle.domain.problem.repository.TagRepository;
import com.peekle.global.redis.RedisKeyConst;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

@Service
@Profile("benchmark")
@RequiredArgsConstructor
@Transactional
public class BenchmarkFixtureService {

    private static final String BENCHMARK_SOURCE = "BOJ";
    private static final String BENCHMARK_URL_PREFIX = "https://www.acmicpc.net/problem/";
    private static final String CSV_TAG_KEY_PREFIX = "csv:";
    private static final String TAG_SEPARATOR = "|";
    private static final long REPLAY_EXTERNAL_ID_BASE = 9_000_000_000L;

    private final ProblemRepository problemRepository;
    private final TagRepository tagRepository;
    private final UserRepository userRepository;
    private final WorkbookRepository workbookRepository;
    private final WorkbookProblemRepository workbookProblemRepository;
    private final RedisGameService gameService;
    private final WorkbookPreviewCacheService workbookPreviewCacheService;
    private final ResourceLoader resourceLoader;
    private final ObjectMapper objectMapper;
    private final RedisTemplate<String, Object> redisTemplate;

    @Value("${benchmark.problem-catalog.path:file:../ai-server/problems.csv}")
    private String problemCatalogPath;

    public List<Long> ensureProblemIds(int count) {
        if (count <= 0) {
            throw new IllegalArgumentException("count must be positive");
        }

        List<Problem> problems = loadProblems(count);
        if (problems.size() < count) {
            importProblemsFromCatalog(count);
            problems = loadProblems(count);
        }

        if (problems.size() < count) {
            throw new IllegalStateException("Expected " + count + " benchmark problems but only loaded " + problems.size());
        }

        return problems.stream()
                .map(Problem::getId)
                .toList();
    }

    public void toggleReady(Long roomId, Long userId) {
        gameService.toggleReady(roomId, userId);
    }

    public void startGame(Long roomId, Long userId) {
        gameService.startGame(roomId, userId);
    }

    public void evictWorkbookPreview(Long roomId) {
        gameService.evictWorkbookPreview(roomId);
    }

    public StartFixtures createStartFixtures(BenchmarkFixtureCommand command) {
        BenchmarkFixtureCommand normalized = normalize(command);
        List<Long> problemIds = ensureProblemIds(normalized.datasetSize());
        User owner = createBenchmarkUser(normalized.prefix(), "owner", 0);
        BenchmarkWorkbookFixture workbookFixture = createBenchmarkWorkbook(owner, problemIds, normalized.prefix());
        List<User> hosts = createBenchmarkUsers(normalized.prefix(), "host", normalized.totalIterations());
        List<User> guests = createBenchmarkUsers(normalized.prefix(), "guest", normalized.totalIterations());
        List<StartRoomFixture> rooms = new ArrayList<>(normalized.totalIterations());
        for (int index = 0; index < normalized.totalIterations(); index++) {
            User host = hosts.get(index);
            User guest = guests.get(index);
            rooms.add(createWaitingRoomFixture(
                    workbookFixture.workbookId(),
                    normalized,
                    host,
                    guest,
                    roomTitle(normalized.prefix(), index)));
        }

        return new StartFixtures(workbookFixture.workbookId(), rooms);
    }

    public CreateRoomFixtures createCreateRoomFixtures(BenchmarkFixtureCommand command) {
        BenchmarkFixtureCommand normalized = normalize(command);
        List<Long> problemIds = ensureProblemIds(normalized.datasetSize());
        User owner = createBenchmarkUser(normalized.prefix(), "owner", 0);
        BenchmarkWorkbookFixture workbookFixture = createBenchmarkWorkbook(owner, problemIds, normalized.prefix());
        List<User> hosts = createBenchmarkUsers(normalized.prefix(), "host", normalized.totalIterations());

        List<CreateRoomHostFixture> hostFixtures = IntStream.range(0, hosts.size())
                .mapToObj(index -> new CreateRoomHostFixture(
                        hosts.get(index).getExtensionToken(),
                        roomTitle(normalized.prefix(), index)))
                .toList();

        return new CreateRoomFixtures(workbookFixture.workbookId(), hostFixtures);
    }

    public FinishRaceFixtures createFinishRaceFixtures(FinishRaceFixtureCommand command) {
        FinishRaceFixtureCommand normalized = normalize(command);
        List<User> players = createBenchmarkUsers(normalized.prefix(), "finish-player", normalized.roomCount() * 2);
        List<FinishRaceRoomFixture> rooms = new ArrayList<>(normalized.roomCount());

        for (int roomIndex = 0; roomIndex < normalized.roomCount(); roomIndex++) {
            User firstPlayer = players.get(roomIndex * 2);
            User secondPlayer = players.get(roomIndex * 2 + 1);
            rooms.add(seedFinishRaceRoom(normalized.prefix(), roomIndex, firstPlayer, secondPlayer));
        }

        return new FinishRaceFixtures(2, rooms);
    }

    private List<Problem> loadProblems(int count) {
        return problemRepository.findBySource(
                        BENCHMARK_SOURCE,
                        PageRequest.of(0, count, Sort.by(Sort.Direction.ASC, "id")))
                .getContent();
    }

    private void importProblemsFromCatalog(int requiredCount) {
        long existingCount = problemRepository.countBySource(BENCHMARK_SOURCE);
        if (existingCount >= requiredCount) {
            return;
        }

        Resource resource = resourceLoader.getResource(problemCatalogPath);
        if (!resource.exists()) {
            throw new IllegalStateException("Problem catalog not found at " + problemCatalogPath);
        }

        Set<String> existingExternalIds = problemRepository.findExternalIdsBySource(BENCHMARK_SOURCE).stream()
                .collect(Collectors.toSet());
        Map<String, Tag> tagsByKey = loadExistingTags();
        List<ProblemCatalogRow> catalogRows;
        try {
            catalogRows = loadCatalogRows(resource);
        } catch (IOException e) {
            throw new IllegalStateException("Failed to import benchmark problems from " + problemCatalogPath, e);
        }

        if (catalogRows.isEmpty()) {
            throw new IllegalStateException("Problem catalog is empty: " + problemCatalogPath);
        }

        List<Problem> problemsToPersist = new ArrayList<>(requiredCount - (int) existingCount);
        for (ProblemCatalogRow row : catalogRows) {
            if (existingExternalIds.size() >= requiredCount) {
                break;
            }

            if (!existingExternalIds.add(row.externalId())) {
                continue;
            }

            problemsToPersist.add(createProblem(row, row.externalId(), tagsByKey));
        }

        if (existingExternalIds.size() < requiredCount) {
            replayCatalogRows(requiredCount, catalogRows, existingExternalIds, tagsByKey, problemsToPersist);
        }

        if (!problemsToPersist.isEmpty()) {
            problemRepository.saveAll(problemsToPersist);
        }

        long totalAvailable = problemRepository.countBySource(BENCHMARK_SOURCE);
        if (totalAvailable < requiredCount) {
            throw new IllegalArgumentException(
                    "Requested " + requiredCount + " benchmark problems, but only imported " + totalAvailable
                            + " BOJ benchmark problems. Path=" + problemCatalogPath);
        }
    }

    private List<ProblemCatalogRow> loadCatalogRows(Resource resource) throws IOException {
        List<ProblemCatalogRow> catalogRows = new ArrayList<>();
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(resource.getInputStream(), StandardCharsets.UTF_8))) {
            CsvHeader header = readHeader(reader);
            String line;
            while ((line = reader.readLine()) != null) {
                if (line.isBlank()) {
                    continue;
                }

                ProblemCatalogRow row = parseProblemCatalogRow(header, line);
                if (row != null) {
                    catalogRows.add(row);
                }
            }
        }
        return catalogRows;
    }

    private void replayCatalogRows(
            int requiredCount,
            List<ProblemCatalogRow> catalogRows,
            Set<String> existingExternalIds,
            Map<String, Tag> tagsByKey,
            List<Problem> problemsToPersist) {
        int replayRound = 1;
        while (existingExternalIds.size() < requiredCount) {
            for (ProblemCatalogRow row : catalogRows) {
                if (existingExternalIds.size() >= requiredCount) {
                    break;
                }

                String replayExternalId = buildReplayExternalId(row.externalId(), replayRound);
                if (!existingExternalIds.add(replayExternalId)) {
                    continue;
                }

                problemsToPersist.add(createProblem(row, replayExternalId, tagsByKey));
            }
            replayRound++;
        }
    }

    private String buildReplayExternalId(String originalExternalId, int replayRound) {
        long suffix = parseReplaySuffix(originalExternalId);
        return String.valueOf(REPLAY_EXTERNAL_ID_BASE + (long) replayRound * 100_000L + suffix);
    }

    private long parseReplaySuffix(String originalExternalId) {
        try {
            return Long.parseLong(originalExternalId);
        } catch (NumberFormatException exception) {
            return Math.abs(originalExternalId.hashCode());
        }
    }

    private Problem createProblem(
            ProblemCatalogRow row,
            String externalId,
            Map<String, Tag> tagsByKey) {
        Problem problem = new Problem(
                BENCHMARK_SOURCE,
                externalId,
                row.title(),
                row.tier(),
                BENCHMARK_URL_PREFIX + row.externalId());
        attachTags(problem, row.tags(), tagsByKey);
        return problem;
    }

    private Map<String, Tag> loadExistingTags() {
        Map<String, Tag> tagsByKey = new LinkedHashMap<>();
        for (Tag tag : tagRepository.findAll()) {
            tagsByKey.put(tag.getKey(), tag);
        }
        return tagsByKey;
    }

    private CsvHeader readHeader(BufferedReader reader) throws IOException {
        String headerLine = reader.readLine();
        if (headerLine == null || headerLine.isBlank()) {
            throw new IllegalStateException("Problem catalog is empty: " + problemCatalogPath);
        }

        List<String> headerColumns = parseCsvRow(headerLine);
        Map<String, Integer> indexes = new HashMap<>();
        for (int i = 0; i < headerColumns.size(); i++) {
            indexes.put(headerColumns.get(i).trim().toLowerCase(Locale.ROOT), i);
        }

        return new CsvHeader(
                requireColumn(indexes, "id"),
                requireColumn(indexes, "title"),
                requireColumn(indexes, "tier"),
                indexes.get("tags"));
    }

    private int requireColumn(Map<String, Integer> indexes, String name) {
        Integer index = indexes.get(name);
        if (index == null) {
            throw new IllegalStateException(
                    "Problem catalog is missing required column '" + name + "': " + problemCatalogPath);
        }
        return index;
    }

    private ProblemCatalogRow parseProblemCatalogRow(CsvHeader header, String line) {
        List<String> values = parseCsvRow(line);
        String externalId = readColumn(values, header.idIndex());
        String title = readColumn(values, header.titleIndex());
        String tier = readColumn(values, header.tierIndex());

        if (externalId.isBlank() || title.isBlank() || tier.isBlank()) {
            return null;
        }

        return new ProblemCatalogRow(
                externalId,
                title,
                tier,
                header.tagsIndex() == null ? "" : readColumn(values, header.tagsIndex()));
    }

    private String readColumn(List<String> values, int index) {
        if (index < 0 || index >= values.size()) {
            return "";
        }
        return values.get(index).trim();
    }

    private void attachTags(Problem problem, String rawTags, Map<String, Tag> tagsByKey) {
        if (rawTags == null || rawTags.isBlank()) {
            return;
        }

        for (String tagName : rawTags.split("\\Q" + TAG_SEPARATOR + "\\E")) {
            String normalizedTagName = tagName.trim();
            if (normalizedTagName.isBlank()) {
                continue;
            }

            String tagKey = CSV_TAG_KEY_PREFIX + normalizedTagName;
            Tag tag = tagsByKey.computeIfAbsent(tagKey, key -> new Tag(key, normalizedTagName));
            problem.addTag(tag);
        }
    }

    private List<String> parseCsvRow(String line) {
        List<String> columns = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        boolean inQuotes = false;

        for (int i = 0; i < line.length(); i++) {
            char currentChar = line.charAt(i);
            if (currentChar == '"') {
                if (inQuotes && i + 1 < line.length() && line.charAt(i + 1) == '"') {
                    current.append('"');
                    i++;
                    continue;
                }
                inQuotes = !inQuotes;
                continue;
            }

            if (currentChar == ',' && !inQuotes) {
                columns.add(current.toString());
                current.setLength(0);
                continue;
            }

            current.append(currentChar);
        }

        columns.add(current.toString());
        return columns;
    }

    private record CsvHeader(int idIndex, int titleIndex, int tierIndex, Integer tagsIndex) {
    }

    private record ProblemCatalogRow(String externalId, String title, String tier, String tags) {
    }

    private BenchmarkFixtureCommand normalize(BenchmarkFixtureCommand command) {
        if (command == null) {
            throw new IllegalArgumentException("fixture command is required");
        }
        if (command.datasetSize() <= 0 || command.totalIterations() <= 0 || command.problemCount() <= 0) {
            throw new IllegalArgumentException("datasetSize, totalIterations, and problemCount must be positive");
        }

        String prefix = command.prefix() == null || command.prefix().isBlank()
                ? "benchmark"
                : command.prefix();

        return new BenchmarkFixtureCommand(
                command.datasetSize(),
                command.totalIterations(),
                command.problemCount(),
                command.maxPlayers() <= 0 ? 2 : command.maxPlayers(),
                command.timeLimitMinutes() <= 0 ? 5 : command.timeLimitMinutes(),
                prefix);
    }

    private FinishRaceFixtureCommand normalize(FinishRaceFixtureCommand command) {
        if (command == null) {
            throw new IllegalArgumentException("finish race fixture command is required");
        }
        if (command.roomCount() <= 0) {
            throw new IllegalArgumentException("roomCount must be positive");
        }

        String prefix = command.prefix() == null || command.prefix().isBlank()
                ? "benchmark-finish"
                : command.prefix();

        return new FinishRaceFixtureCommand(command.roomCount(), prefix);
    }

    private User createBenchmarkUser(String prefix, String role, int index) {
        User user = new User(
                "benchmark_" + UUID.randomUUID(),
                "Google",
                buildNickname(prefix, role, index));
        return userRepository.save(user);
    }

    private List<User> createBenchmarkUsers(String prefix, String role, int count) {
        List<User> users = new ArrayList<>(count);
        for (int index = 0; index < count; index++) {
            users.add(new User(
                    "benchmark_" + UUID.randomUUID(),
                    "Google",
                    buildNickname(prefix, role, index)));
        }
        return userRepository.saveAll(users);
    }

    private String buildNickname(String prefix, String role, int index) {
        return prefix + "-" + role + "-" + index + "-" + UUID.randomUUID();
    }

    private BenchmarkWorkbookFixture createBenchmarkWorkbook(User owner, List<Long> problemIds, String prefix) {
        Workbook workbook = workbookRepository.save(Workbook.builder()
                .title(prefix + "-workbook-" + System.currentTimeMillis())
                .description("Benchmark workbook for " + prefix)
                .creator(owner)
                .build());

        Map<Long, Problem> problemsById = problemRepository.findAllById(problemIds).stream()
                .collect(Collectors.toMap(Problem::getId, problem -> problem));

        List<Problem> orderedProblems = new ArrayList<>(problemIds.size());
        List<WorkbookProblem> workbookProblems = new ArrayList<>(problemIds.size());
        int orderIndex = 0;
        for (Long problemId : problemIds) {
            Problem problem = problemsById.get(problemId);
            if (problem == null) {
                throw new IllegalStateException("Missing benchmark problem: " + problemId);
            }
            orderedProblems.add(problem);
            workbookProblems.add(WorkbookProblem.builder()
                    .workbook(workbook)
                    .problem(problem)
                    .orderIndex(orderIndex++)
                    .build());
        }

        workbookProblemRepository.saveAll(workbookProblems);
        return new BenchmarkWorkbookFixture(workbook.getId(), orderedProblems);
    }

    private GameCreateRequest createRoomRequest(Long workbookId, BenchmarkFixtureCommand command, String title) {
        return objectMapper.convertValue(Map.of(
                "title", title,
                "maxPlayers", command.maxPlayers(),
                "timeLimit", command.timeLimitMinutes(),
                "problemCount", command.problemCount(),
                "teamType", "INDIVIDUAL",
                "mode", "TIME_ATTACK",
                "problemSource", "WORKBOOK",
                "selectedWorkbookId", String.valueOf(workbookId)), GameCreateRequest.class);
    }

    private String roomTitle(String prefix, int index) {
        return prefix + "-room-" + index + "-" + UUID.randomUUID();
    }

    private FinishRaceRoomFixture seedFinishRaceRoom(String prefix, int roomIndex, User firstPlayer, User secondPlayer) {
        Long roomId = redisTemplate.opsForValue().increment(RedisKeyConst.GAME_ROOM_ID_SEQ);
        if (roomId == null) {
            throw new IllegalStateException("Failed to allocate benchmark finish room id");
        }

        String infoKey = String.format(RedisKeyConst.GAME_ROOM_INFO, roomId);
        String statusKey = String.format(RedisKeyConst.GAME_STATUS, roomId);
        String playersKey = String.format(RedisKeyConst.GAME_ROOM_PLAYERS, roomId);
        String readyKey = String.format(RedisKeyConst.GAME_ROOM_READY_STATUS, roomId);
        String rankingKey = String.format(RedisKeyConst.GAME_RANKING, roomId);

        Map<String, String> roomInfo = new HashMap<>();
        roomInfo.put("title", prefix + "-finish-room-" + roomIndex);
        roomInfo.put("maxPlayers", "2");
        roomInfo.put("timeLimit", "300");
        roomInfo.put("problemCount", "2");
        roomInfo.put("problemSource", "BOJ_RANDOM");
        roomInfo.put("teamType", "INDIVIDUAL");
        roomInfo.put("mode", "TIME_ATTACK");
        roomInfo.put("hostId", String.valueOf(firstPlayer.getId()));
        roomInfo.put("hostNickname", firstPlayer.getNickname());
        roomInfo.put("hostProfileImg", firstPlayer.getProfileImg() != null ? firstPlayer.getProfileImg() : "");

        redisTemplate.opsForHash().putAll(infoKey, roomInfo);
        redisTemplate.opsForValue().set(statusKey, GameStatus.PLAYING.name());
        redisTemplate.opsForValue().set(String.format(RedisKeyConst.GAME_START_TIME, roomId),
                String.valueOf(System.currentTimeMillis() - 60_000));
        redisTemplate.opsForSet().add(RedisKeyConst.GAME_ROOM_IDS, String.valueOf(roomId));
        redisTemplate.opsForSet().add(playersKey, String.valueOf(firstPlayer.getId()), String.valueOf(secondPlayer.getId()));
        redisTemplate.opsForHash().put(readyKey, String.valueOf(firstPlayer.getId()), "true");
        redisTemplate.opsForHash().put(readyKey, String.valueOf(secondPlayer.getId()), "true");
        redisTemplate.opsForValue().set(String.format(RedisKeyConst.USER_CURRENT_GAME, firstPlayer.getId()),
                String.valueOf(roomId));
        redisTemplate.opsForValue().set(String.format(RedisKeyConst.USER_CURRENT_GAME, secondPlayer.getId()),
                String.valueOf(roomId));

        redisTemplate.opsForHash().put(String.format(RedisKeyConst.GAME_USER_SCORE, roomId, firstPlayer.getId()),
                "solvedCount", "2");
        redisTemplate.opsForHash().put(String.format(RedisKeyConst.GAME_USER_SCORE, roomId, firstPlayer.getId()),
                "lastSolvedSeconds", "12");
        redisTemplate.opsForHash().put(String.format(RedisKeyConst.GAME_USER_SCORE, roomId, secondPlayer.getId()),
                "solvedCount", "1");
        redisTemplate.opsForHash().put(String.format(RedisKeyConst.GAME_USER_SCORE, roomId, secondPlayer.getId()),
                "lastSolvedSeconds", "48");

        redisTemplate.opsForZSet().add(rankingKey, String.valueOf(firstPlayer.getId()), 200_000_000D - 12D);
        redisTemplate.opsForZSet().add(rankingKey, String.valueOf(secondPlayer.getId()), 100_000_000D - 48D);

        return new FinishRaceRoomFixture(roomId);
    }

    private StartRoomFixture createWaitingRoomFixture(
            Long workbookId,
            BenchmarkFixtureCommand command,
            User host,
            User guest,
            String title) {
        Long roomId = redisTemplate.opsForValue().increment(RedisKeyConst.GAME_ROOM_ID_SEQ);
        if (roomId == null) {
            throw new IllegalStateException("Failed to allocate benchmark room id");
        }

        String infoKey = String.format(RedisKeyConst.GAME_ROOM_INFO, roomId);
        String playersKey = String.format(RedisKeyConst.GAME_ROOM_PLAYERS, roomId);
        String readyKey = String.format(RedisKeyConst.GAME_ROOM_READY_STATUS, roomId);

        Map<String, String> roomInfo = new HashMap<>();
        roomInfo.put("title", title);
        roomInfo.put("maxPlayers", String.valueOf(command.maxPlayers()));
        roomInfo.put("timeLimit", String.valueOf(command.timeLimitMinutes() * 60));
        roomInfo.put("problemCount", String.valueOf(command.problemCount()));
        roomInfo.put("problemSource", "WORKBOOK");
        roomInfo.put("teamType", "INDIVIDUAL");
        roomInfo.put("mode", "TIME_ATTACK");
        roomInfo.put("hostId", String.valueOf(host.getId()));
        roomInfo.put("selectedWorkbookId", String.valueOf(workbookId));
        roomInfo.put("hostNickname", host.getNickname());
        roomInfo.put("hostProfileImg", host.getProfileImg() != null ? host.getProfileImg() : "");
        roomInfo.put(WorkbookPreviewCacheService.PREVIEW_READY_FIELD, "false");
        roomInfo.put(WorkbookPreviewCacheService.PREVIEW_COUNT_FIELD, "0");

        redisTemplate.opsForValue().set(String.format(RedisKeyConst.GAME_STATUS, roomId), GameStatus.WAITING.name());
        redisTemplate.opsForHash().putAll(infoKey, roomInfo);
        redisTemplate.opsForSet().add(RedisKeyConst.GAME_ROOM_IDS, String.valueOf(roomId));
        redisTemplate.opsForSet().add(playersKey, String.valueOf(host.getId()), String.valueOf(guest.getId()));
        redisTemplate.opsForHash().put(readyKey, String.valueOf(host.getId()), "true");
        redisTemplate.opsForHash().put(readyKey, String.valueOf(guest.getId()), "true");
        redisTemplate.opsForValue().set(String.format(RedisKeyConst.USER_CURRENT_GAME, host.getId()), String.valueOf(roomId));
        redisTemplate.opsForValue().set(String.format(RedisKeyConst.USER_CURRENT_GAME, guest.getId()), String.valueOf(roomId));
        workbookPreviewCacheService.prepareWorkbookPreview(roomId, command.problemCount());

        return new StartRoomFixture(roomId, host.getExtensionToken(), guest.getExtensionToken());
    }

    public record BenchmarkFixtureCommand(
            int datasetSize,
            int totalIterations,
            int problemCount,
            int maxPlayers,
            int timeLimitMinutes,
            String prefix) {
    }

    public record FinishRaceFixtureCommand(
            int roomCount,
            String prefix) {
    }

    public record StartFixtures(Long workbookId, List<StartRoomFixture> rooms) {
    }

    public record StartRoomFixture(Long roomId, String hostToken, String guestToken) {
    }

    public record CreateRoomFixtures(Long workbookId, List<CreateRoomHostFixture> hosts) {
    }

    public record CreateRoomHostFixture(String token, String title) {
    }

    public record FinishRaceFixtures(int playersPerRoom, List<FinishRaceRoomFixture> rooms) {
    }

    public record FinishRaceRoomFixture(Long roomId) {
    }

    private record BenchmarkWorkbookFixture(Long workbookId, List<Problem> problems) {
    }
}
