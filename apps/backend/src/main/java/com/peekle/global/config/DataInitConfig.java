package com.peekle.global.config;

import com.peekle.domain.league.enums.LeagueTier;
import com.peekle.domain.problem.entity.Problem;
import com.peekle.domain.problem.repository.ProblemRepository;
import com.peekle.domain.study.entity.StudyMember;
import com.peekle.domain.study.entity.StudyRoom;
import com.peekle.domain.study.repository.StudyMemberRepository;
import com.peekle.domain.study.repository.StudyRoomRepository;
import com.peekle.domain.study.entity.StudyChatLog;
import com.peekle.domain.study.entity.StudyProblem;
import com.peekle.domain.study.repository.StudyChatLogRepository;
import com.peekle.domain.study.repository.StudyProblemRepository;
import com.peekle.domain.user.entity.User;
import com.peekle.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

import java.time.LocalDate;
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

    @Bean
    public CommandLineRunner initData() {
        return args -> {
            // 1. User Mock Data
            if (userRepository.count() == 0) {
                User user1 = User.builder()
                        .nickname("알고마스터")
                        .provider("GOOGLE")
                        .socialId("mock_social_1")
                        .bojId("algo_master")
                        .profileImg("https://api.dicebear.com/7.x/avataaars/svg?seed=algo")
                        .league(LeagueTier.GOLD)
                        .leaguePoint(1200)
                        .build();

                User user2 = User.builder()
                        .nickname("코딩뉴비")
                        .provider("KAKAO")
                        .socialId("mock_social_2")
                        .bojId("newbie_coder")
                        .profileImg("https://api.dicebear.com/7.x/avataaars/svg?seed=newbie")
                        .league(LeagueTier.BRONZE)
                        .leaguePoint(100)
                        .build();

                User user3 = User.builder()
                        .nickname("자바고수")
                        .provider("NAVER")
                        .socialId("mock_social_3")
                        .bojId("java_gosu")
                        .profileImg("https://api.dicebear.com/7.x/avataaars/svg?seed=java")
                        .league(LeagueTier.SILVER)
                        .leaguePoint(500)
                        .build();

                userRepository.saveAll(List.of(user1, user2, user3));
            }

            // 2. Problem Mock Data
            if (problemRepository.count() == 0) {
                Problem p1 = new Problem("BOJ", "1000", "A+B", "Bronze 5", "https://www.acmicpc.net/problem/1000");
                Problem p2 = new Problem("BOJ", "1001", "A-B", "Bronze 5", "https://www.acmicpc.net/problem/1001");

                problemRepository.saveAll(List.of(p1, p2));
            }

            // 3. StudyRoom Mock Data
            if (studyRoomRepository.count() == 0) {
                User owner = userRepository.findByNickname("알고마스터").orElseThrow();
                User member1 = userRepository.findByNickname("코딩뉴비").orElseThrow();
                User member2 = userRepository.findByNickname("자바고수").orElseThrow();

                StudyRoom room = StudyRoom.builder()
                        .title("알고리즘 마스터 스터디")
                        .description("매주 월/수/금 알고리즘 문제를 함께 풀어요!")
                        .owner(owner)
                        .build();

                studyRoomRepository.save(room);

                StudyMember ownerMember = StudyMember.builder()
                        .study(room)
                        .user(owner)
                        .role(StudyMember.StudyRole.OWNER)
                        .build();

                StudyMember m1 = StudyMember.builder()
                        .study(room)
                        .user(member1)
                        .role(StudyMember.StudyRole.MEMBER)
                        .build();

                StudyMember m2 = StudyMember.builder()
                        .study(room)
                        .user(member2)
                        .role(StudyMember.StudyRole.MEMBER)
                        .build();

                studyMemberRepository.saveAll(List.of(ownerMember, m1, m2));
            }

            // 4. StudyProblem Mock Data
            if (studyProblemRepository.count() == 0) {
                StudyRoom room = studyRoomRepository.findAll().stream()
                        .filter(r -> r.getTitle().equals("알고리즘 마스터 스터디"))
                        .findFirst()
                        .orElseThrow();
                User owner = userRepository.findByNickname("알고마스터").orElseThrow();
                List<Problem> problems = problemRepository.findAll();

                if (!problems.isEmpty()) {
                    StudyProblem sp1 = StudyProblem.builder()
                            .study(room)
                            .problemId(problems.get(0).getId())
                            .problemDate(LocalDate.now())
                            .createdBy(owner)
                            .build();

                    studyProblemRepository.save(sp1);

                    if (problems.size() > 1) {
                        StudyProblem sp2 = StudyProblem.builder()
                                .study(room)
                                .problemId(problems.get(1).getId())
                                .problemDate(LocalDate.now().plusDays(1))
                                .createdBy(owner)
                                .build();
                        studyProblemRepository.save(sp2);
                    }
                }
            }

            // 5. StudyChatLog Mock Data
            if (studyChatLogRepository.count() == 0) {
                StudyRoom room = studyRoomRepository.findAll().stream()
                        .filter(r -> r.getTitle().equals("알고리즘 마스터 스터디"))
                        .findFirst()
                        .orElseThrow();
                User owner = userRepository.findByNickname("알고마스터").orElseThrow();
                User member1 = userRepository.findByNickname("코딩뉴비").orElseThrow();

                StudyChatLog c1 = StudyChatLog.builder()
                        .study(room)
                        .user(owner)
                        .message("반갑습니다! 오늘부터 열심히 해봐요.")
                        .type(StudyChatLog.ChatType.TALK)
                        .build();

                StudyChatLog c2 = StudyChatLog.builder()
                        .study(room)
                        .user(member1)
                        .message("네! 열심히 하겠습니다.")
                        .type(StudyChatLog.ChatType.TALK)
                        .build();

                studyChatLogRepository.saveAll(List.of(c1, c2));
            }
        };
    }
}