package com.peekle.global.config;

import com.peekle.domain.league.enums.LeagueTier;
import com.peekle.domain.problem.entity.Problem;
import com.peekle.domain.problem.entity.Tag;
import com.peekle.domain.problem.repository.ProblemRepository;
import com.peekle.domain.study.entity.StudyMember;
import com.peekle.domain.study.entity.StudyRoom;
import com.peekle.domain.study.enums.ProblemType;
import com.peekle.domain.study.repository.StudyMemberRepository;
import com.peekle.domain.study.repository.StudyRoomRepository;
import com.peekle.domain.study.entity.StudyChatLog;
import com.peekle.domain.study.entity.StudyProblem;
import com.peekle.domain.study.repository.StudyChatLogRepository;
import com.peekle.domain.study.repository.StudyProblemRepository;
import com.peekle.domain.submission.entity.SubmissionLog;
import com.peekle.domain.submission.enums.SourceType;
import com.peekle.domain.submission.repository.SubmissionLogRepository;
import com.peekle.domain.user.entity.User;
import com.peekle.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Configuration
@RequiredArgsConstructor
@Profile("dev")
public class DataInitConfig {

        private final UserRepository userRepository;
        private final StudyRoomRepository studyRoomRepository;
        private final ProblemRepository problemRepository;
        private final StudyMemberRepository studyMemberRepository;
        private final StudyProblemRepository studyProblemRepository;
        private final StudyChatLogRepository studyChatLogRepository;
        private final SubmissionLogRepository submissionLogRepository;
        private final JdbcTemplate jdbcTemplate;

        @Bean
        public CommandLineRunner initData() {
                return args -> {
                        // Reset Sequence for H2 dynamically based on existing data
                        try {
                                Long maxUserId = jdbcTemplate.queryForObject("SELECT MAX(id) FROM users", Long.class);
                                if (maxUserId == null)
                                        maxUserId = 0L;
                                jdbcTemplate.execute(
                                                "ALTER TABLE users ALTER COLUMN id RESTART WITH " + (maxUserId + 1));

                                Long maxRoomId = jdbcTemplate.queryForObject("SELECT MAX(id) FROM study_rooms",
                                                Long.class);
                                if (maxRoomId == null)
                                        maxRoomId = 0L;
                                jdbcTemplate.execute("ALTER TABLE study_rooms ALTER COLUMN id RESTART WITH "
                                                + (maxRoomId + 1));
                        } catch (Exception e) {
                                // Ignore if table doesn't exist yet or other issues
                                System.out.println("Failed to reset H2 sequence: " + e.getMessage());
                        }

                        // 2. Problem Mock Data
                        if (problemRepository.count() == 0) {
                                Tag tMath = new Tag("math", "수학");
                                Tag tImpl = new Tag("implementation", "구현");
                                Tag tArith = new Tag("arithmetic", "사칙연산");
                                Tag tBinSearch = new Tag("binary_search", "이분 탐색");
                                Tag tSort = new Tag("sorting", "정렬");
                                Tag tDP = new Tag("dp", "다이나믹 프로그래밍");

                                Problem p1 = new Problem("BOJ", "1000", "A+B", "Bronze V",
                                                "https://www.acmicpc.net/problem/1000");
                                p1.getTags().add(tMath);
                                p1.getTags().add(tImpl);
                                p1.getTags().add(tArith);

                                Problem p2 = new Problem("BOJ", "2557", "Hello World", "Bronze V",
                                                "https://www.acmicpc.net/problem/2557");
                                p2.getTags().add(tImpl);

                                Problem p3 = new Problem("BOJ", "1920", "수 찾기", "Silver IV",
                                                "https://www.acmicpc.net/problem/1920");
                                p3.getTags().add(tBinSearch);
                                p3.getTags().add(tSort);

                                Problem p4 = new Problem("BOJ", "1149", "RGB거리", "Silver I",
                                                "https://www.acmicpc.net/problem/1149");
                                p4.getTags().add(tDP);

                                problemRepository.saveAll(List.of(p1, p2, p3, p4));
                        }




        // 6. Submission Logs
        if(submissionLogRepository.count()==0){
        // Fallback to AlgorithmKing if TestUser100 is not found
        User targetUser = userRepository.findByNickname("TestUser100")
                        .or(() -> userRepository.findByNickname("AlgorithmKing"))
                        .orElse(null);

        if(targetUser!=null)
        {
                List<Problem> problems = problemRepository.findAll();
                if (problems.isEmpty())
                        return; // Prevent crash if no problems

                Problem p1000 = problems.stream().filter(p -> p.getExternalId().equals("1000"))
                                .findFirst().orElse(problems.get(0));
                Problem p2557 = problems.stream().filter(p -> p.getExternalId().equals("2557"))
                                .findFirst().orElse(problems.get(0));
                Problem p1920 = problems.stream().filter(p -> p.getExternalId().equals("1920"))
                                .findFirst().orElse(problems.get(0));
                Problem p1149 = problems.stream().filter(p -> p.getExternalId().equals("1149"))
                                .findFirst().orElse(problems.get(0));

                SubmissionLog l1 = SubmissionLog.create(
                                targetUser, p1000, SourceType.EXTENSION, "A+B", "Bronze V",
                                "1000", null, "맞았습니다", true,
                                "a, b = map(int, input().split())\\nprint(a+b)", 31120, 40,
                                "Python", LocalDateTime.now().minusDays(5));

                SubmissionLog l2 = SubmissionLog.create(
                                targetUser, p2557, SourceType.STUDY, "Hello World", "Bronze V",
                                "2557", "알고리즘 스터디", "맞았습니다", true,
                                "#include <iostream>\\nusing namespace std;\\nint main() { cout << \"Hello World!\"; return 0; }",
                                2020, 0, "C++", LocalDateTime.now().minusDays(3));
                l2.setRoomId(101L);

                SubmissionLog l3 = SubmissionLog.create(
                                targetUser, p1920, SourceType.GAME, "수 찾기", "Silver IV", "1920",
                                "개인전", "맞았습니다", true,
                                "import java.util.*;\\npublic class Main {\\n    public static void main(String[] args) {\\n        // Solution...\\n    }\\n}",
                                128000, 1200, "Java", LocalDateTime.now().minusDays(1));
                l3.setRoomId(201L);

                SubmissionLog l4 = SubmissionLog.create(
                                targetUser, p1149, SourceType.GAME, "RGB거리", "Silver I", "1149",
                                "팀전", "틀렸습니다", false,
                                "import java.io.*;\\n// Wrong Solution...", 14536, 120, "Java",
                                LocalDateTime.now().minusHours(1));
                l4.setRoomId(202L);

                // Case 5: 개인 풀이 (EXTENSION)
                SubmissionLog l5 = SubmissionLog.create(
                                targetUser, p1920, SourceType.EXTENSION, "수 찾기", "Silver IV",
                                "1920", null, "맞았습니다", true,
                                "// Personal Solution\\nimport java.util.*;\\npublic class Main {\\n    public static void main(String[] args) {\\n        Scanner sc = new Scanner(System.in);\\n        // ...\\n    }\\n}",
                                130000, 500, "Java", LocalDateTime.now().minusDays(2));

                submissionLogRepository.saveAll(List.of(l1, l2, l3, l4, l5));
        }
}};}}