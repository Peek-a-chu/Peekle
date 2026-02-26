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

                        // 1. User Mock Data (20 members)
                        if (userRepository.count() == 0) {
                                User user1 = User.builder().nickname("AlgorithmKing").provider("KAKAO")
                                                .socialId("kakao_1").bojId("boj_king")
                                                .profileImg("https://api.dicebear.com/9.x/pixel-art/svg?seed=King")
                                                .league(LeagueTier.GOLD).leaguePoint(1200).build();
                                User user2 = User.builder().nickname("CodeMaster").provider("KAKAO").socialId("kakao_2")
                                                .bojId("boj_master")
                                                .profileImg("https://api.dicebear.com/9.x/pixel-art/svg?seed=Master")
                                                .league(LeagueTier.SILVER).leaguePoint(800).build();
                                User user3 = User.builder().nickname("JavaGuru").provider("KAKAO").socialId("kakao_3")
                                                .bojId("boj_java")
                                                .profileImg("https://api.dicebear.com/9.x/pixel-art/svg?seed=Java")
                                                .league(LeagueTier.BRONZE).leaguePoint(300).build();
                                User user4 = User.builder().nickname("PythonLover").provider("KAKAO")
                                                .socialId("kakao_4").bojId("boj_python")
                                                .profileImg("https://api.dicebear.com/9.x/pixel-art/svg?seed=Python")
                                                .league(LeagueTier.STONE).leaguePoint(50).build();
                                User user5 = User.builder().nickname("CppWarrior").provider("KAKAO").socialId("kakao_5")
                                                .bojId("boj_cpp")
                                                .profileImg("https://api.dicebear.com/9.x/pixel-art/svg?seed=Cpp")
                                                .league(LeagueTier.SILVER).leaguePoint(600).build();
                                User user6 = User.builder().nickname("FrontendWizard").provider("KAKAO")
                                                .socialId("kakao_6").bojId("boj_fe")
                                                .profileImg("https://api.dicebear.com/9.x/pixel-art/svg?seed=Front")
                                                .league(LeagueTier.STONE).leaguePoint(100).build();
                                User user7 = User.builder().nickname("BackendHero").provider("KAKAO")
                                                .socialId("kakao_7").bojId("boj_be")
                                                .profileImg("https://api.dicebear.com/9.x/pixel-art/svg?seed=Back")
                                                .league(LeagueTier.GOLD).leaguePoint(1100).build();
                                User user8 = User.builder().nickname("FullStackDev").provider("KAKAO")
                                                .socialId("kakao_8").bojId("boj_full")
                                                .profileImg("https://api.dicebear.com/9.x/pixel-art/svg?seed=Full")
                                                .league(LeagueTier.SILVER).leaguePoint(900).build();
                                User user9 = User.builder().nickname("AIResearcher").provider("KAKAO")
                                                .socialId("kakao_9").bojId("boj_ai")
                                                .profileImg("https://api.dicebear.com/9.x/pixel-art/svg?seed=AI")
                                                .league(LeagueTier.BRONZE).leaguePoint(400).build();
                                User user10 = User.builder().nickname("DataScientist").provider("KAKAO")
                                                .socialId("kakao_10").bojId("boj_data")
                                                .profileImg("https://api.dicebear.com/9.x/pixel-art/svg?seed=Data")
                                                .league(LeagueTier.STONE).leaguePoint(0).build();
                                User user11 = User.builder().nickname("NewbieCoder").provider("KAKAO")
                                                .socialId("kakao_11").bojId("boj_newbie")
                                                .profileImg("https://api.dicebear.com/9.x/pixel-art/svg?seed=Newbie")
                                                .league(LeagueTier.STONE).leaguePoint(10).build();
                                User user12 = User.builder().nickname("ProGamer").provider("KAKAO").socialId("kakao_12")
                                                .bojId("boj_gamer")
                                                .profileImg("https://api.dicebear.com/9.x/pixel-art/svg?seed=Gamer")
                                                .league(LeagueTier.GOLD).leaguePoint(1300).build();
                                User user13 = User.builder().nickname("DailyCommit").provider("KAKAO")
                                                .socialId("kakao_13").bojId("boj_daily")
                                                .profileImg("https://api.dicebear.com/9.x/pixel-art/svg?seed=Daily")
                                                .league(LeagueTier.SILVER).leaguePoint(750).build();
                                User user14 = User.builder().nickname("LateNightCoding").provider("KAKAO")
                                                .socialId("kakao_14").bojId("boj_night")
                                                .profileImg("https://api.dicebear.com/9.x/pixel-art/svg?seed=Night")
                                                .league(LeagueTier.BRONZE).leaguePoint(250).build();
                                User user15 = User.builder().nickname("MorningPerson").provider("KAKAO")
                                                .socialId("kakao_15").bojId("boj_morning")
                                                .profileImg("https://api.dicebear.com/9.x/pixel-art/svg?seed=Morning")
                                                .league(LeagueTier.STONE).leaguePoint(20).build();
                                User user16 = User.builder().nickname("AlgorithmStruggle").provider("KAKAO")
                                                .socialId("kakao_16").bojId("boj_struggle")
                                                .profileImg("https://api.dicebear.com/9.x/pixel-art/svg?seed=Struggle")
                                                .league(LeagueTier.STONE).leaguePoint(0).build();
                                User user17 = User.builder().nickname("CodingMachine").provider("KAKAO")
                                                .socialId("kakao_17").bojId("boj_machine")
                                                .profileImg("https://api.dicebear.com/9.x/pixel-art/svg?seed=Machine")
                                                .league(LeagueTier.GOLD).leaguePoint(1500).build();
                                User user18 = User.builder().nickname("BugFixer").provider("KAKAO").socialId("kakao_18")
                                                .bojId("boj_fixer")
                                                .profileImg("https://api.dicebear.com/9.x/pixel-art/svg?seed=Fixer")
                                                .league(LeagueTier.SILVER).leaguePoint(500).build();
                                User user19 = User.builder().nickname("CodeReviewer").provider("KAKAO")
                                                .socialId("kakao_19").bojId("boj_review")
                                                .profileImg("https://api.dicebear.com/9.x/pixel-art/svg?seed=Review")
                                                .league(LeagueTier.BRONZE).leaguePoint(350).build();
                                User user20 = User.builder().nickname("TeamLeader").provider("KAKAO")
                                                .socialId("kakao_20").bojId("boj_leader")
                                                .profileImg("https://api.dicebear.com/9.x/pixel-art/svg?seed=Leader")
                                                .league(LeagueTier.GOLD).leaguePoint(1400).build();
                                User testUser = User.builder().nickname("TestUser100").provider("KAKAO")
                                                .socialId("kakao_100").bojId("boj_test_100")
                                                .league(LeagueTier.GOLD).leaguePoint(1000).build();

                                userRepository.saveAll(List.of(user1, user2, user3, user4, user5, user6, user7, user8,
                                                user9, user10,
                                                user11, user12, user13, user14, user15, user16, user17, user18, user19,
                                                user20, testUser));
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