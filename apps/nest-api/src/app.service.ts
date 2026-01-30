import { Injectable, OnModuleInit } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Raw, Like } from "typeorm";
import { Submission } from "./entities/submission.entity";
import { AvailableProblem } from "./entities/available-problem.entity";
import { StudyProblem } from "./entities/study-problem.entity";
import { StudyProblemParticipant } from "./entities/study-problem-participant.entity";

@Injectable()
export class AppService implements OnModuleInit {
  constructor(
    @InjectRepository(Submission)
    private submissionRepository: Repository<Submission>,
    @InjectRepository(AvailableProblem)
    private availableProblemRepository: Repository<AvailableProblem>,
    @InjectRepository(StudyProblem)
    private studyProblemRepository: Repository<StudyProblem>,
    @InjectRepository(StudyProblemParticipant)
    private studyProblemParticipantRepository: Repository<StudyProblemParticipant>,
  ) {}

  getHello(): string {
    return "Hello World From NestJS!";
  }

  // --- Study Room Management ---

  async createStudy(title: string) {
    // Mock implementation
    return {
      inviteCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
    };
  }

  async joinStudy(inviteCode: string, userId: number) {
    // Mock implementation
    return {
      id: 1,
      title: "Java Algo",
      ownerId: 100,
      members: await this.getParticipants("1"),
    };
  }

  async createInviteCode(studyId: string) {
    return {
      inviteCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
    };
  }

  async getMyStudies(userId: number, page: number, keyword: string) {
    // Mock
    return {
      content: [{ id: 1, title: "Java Algo", memberCount: 3 }],
      totalPages: 1,
    };
  }

  async getStudyDetail(studyId: string) {
    return {
      id: Number(studyId),
      title: "Java Algo",
      members: await this.getParticipants(studyId),
    };
  }

  async getStudyRoom(studyId: string) {
    return {
      roomId: Number(studyId),
      roomTitle: "알고리즘 마스터 스터디",
      roomDescription: "매주 월/수/금 알고리즘 문제를 함께 풀어요!",
      inviteCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
    };
  }

  async getProblems(studyId: string, date: string): Promise<any[]> {
    console.log("Getting problems for date: " + date);

    // Query StudyProblem with AvailableProblem relation
    const query = this.studyProblemRepository
      .createQueryBuilder("sp")
      .leftJoinAndSelect("sp.problem", "ap")
      .where("sp.studyId = :studyId", { studyId })
      .orderBy("sp.createdAt", "DESC");

    const studyProblems = await query.getMany();
    console.log("Found " + studyProblems.length + " study problems total.");

    let filtered = studyProblems;
    if (date) {
      filtered = studyProblems.filter((p) => {
        let pDateStr = "";
        if (p.createdAt instanceof Date) {
          pDateStr = p.createdAt.toISOString().split("T")[0];
        } else {
          pDateStr = String(p.createdAt).split("T")[0].split(" ")[0];
        }
        return pDateStr === date;
      });
      console.log(
        "Filtered down to " + filtered.length + " problems for date " + date,
      );
    }
    // Map to Frontend Problem Shape
    const totalParticipants = (await this.getParticipants(studyId)).length;

    const enriched = await Promise.all(
      filtered.map(async (sp) => {
        const solvedCount = await this.submissionRepository
          .createQueryBuilder("sub")
          .where("sub.studyProblemId = :spId", { spId: sp.id })
          .andWhere("sub.status = :status", { status: "success" })
          .select("DISTINCT sub.userId")
          .getCount();

        return {
          id: sp.id, // StudyProblem ID
          createdAt: sp.createdAt,
          title: sp.problem.title,
          number: sp.problem.number,
          source: sp.problem.source,
          status: solvedCount > 0 ? "success" : "not_started", // Simple heuristic
          tags: sp.problem.tags,
          participantCount: solvedCount,
          totalParticipants: totalParticipants,
          url: "https://www.acmicpc.net/problem/" + sp.problem.number,
          tier: sp.problem.tier,
        };
      }),
    );

    return enriched;
  }

  async getDailyCurriculum(studyId: string, date: string) {
    return this.getProblems(studyId, date);
  }

  async getParticipants(studyId: string) {
    // Mock participants data for testing
    return [
      {
        userId: 1,
        id: 1,
        odUid: "user1",
        nickname: "알고마스터",
        profileImage: "https://api.dicebear.com/7.x/avataaars/svg?seed=algo",
        isOwner: true,
        isMuted: false,
        isVideoOff: false,
        isOnline: true,
        lastSpeakingAt: Date.now() - 1000,
      },
      {
        userId: 2,
        id: 2,
        odUid: "user2",
        nickname: "CodeNinja",
        profileImage: "https://api.dicebear.com/7.x/avataaars/svg?seed=ninja",
        isOwner: false,
        isMuted: false,
        isVideoOff: false,
        isOnline: true,
        lastSpeakingAt: Date.now() - 5000,
      },
      {
        userId: 3,
        id: 3,
        odUid: "user3",
        nickname: "PS러버",
        profileImage: "https://api.dicebear.com/7.x/avataaars/svg?seed=ps",
        isOwner: false,
        isMuted: true,
        isVideoOff: false,
        isOnline: true,
        lastSpeakingAt: Date.now() - 10000,
      },
      {
        userId: 4,
        id: 4,
        odUid: "user4",
        nickname: "백준킹",
        profileImage: "https://api.dicebear.com/7.x/avataaars/svg?seed=king",
        isOwner: false,
        isMuted: true,
        isVideoOff: true,
        isOnline: false,
      },
    ];
  }

  async getChats(studyId: string, page: number = 0): Promise<any[]> {
    const baseTime = Date.now();
    return [
      {
        id: "chat-1",
        roomId: Number(studyId),
        senderId: 1,
        senderName: "알고마스터",
        content: "안녕하세요! 오늘 스터디 시작하겠습니다~",
        type: "TALK",
        createdAt: new Date(baseTime - 7200000).toISOString(), // 2시간 전
      },
      {
        id: "chat-2",
        roomId: Number(studyId),
        senderId: 2,
        senderName: "CodeNinja",
        content: "안녕하세요! 오늘 풀 문제는 무엇인가요?",
        type: "TALK",
        createdAt: new Date(baseTime - 6900000).toISOString(),
      },
      {
        id: "chat-3",
        roomId: Number(studyId),
        senderId: 1,
        senderName: "알고마스터",
        content:
          "오늘은 A+B, A-B, 터렛 문제를 풀어볼게요. 터렛이 조금 어려울 수 있어요!",
        type: "TALK",
        createdAt: new Date(baseTime - 6600000).toISOString(),
      },
      {
        id: "chat-4",
        roomId: Number(studyId),
        senderId: 3,
        senderName: "PS러버",
        content: "터렛 문제 기하학이죠? 원의 교점 구하는 문제!",
        type: "TALK",
        createdAt: new Date(baseTime - 6300000).toISOString(),
      },
      {
        id: "chat-5",
        roomId: Number(studyId),
        senderId: 2,
        senderName: "CodeNinja",
        content: "저 A+B 먼저 풀어볼게요~",
        type: "TALK",
        parentMessage: {
          id: "chat-3",
          senderId: 1,
          senderName: "알고마스터",
          content: "오늘은 A+B, A-B, 터렛 문제를 풀어볼게요.",
          type: "TALK",
        },
        createdAt: new Date(baseTime - 5400000).toISOString(),
      },
      {
        id: "chat-6",
        roomId: Number(studyId),
        senderId: 2,
        senderName: "CodeNinja",
        content: "A+B 풀었습니다!",
        type: "CODE",
        metadata: {
          language: "javascript",
          problemTitle: "A+B",
          codePreview:
            "const [a, b] = input.split(' ').map(Number);\nconsole.log(a + b);",
        },
        createdAt: new Date(baseTime - 4800000).toISOString(),
      },
      {
        id: "chat-7",
        roomId: Number(studyId),
        senderId: 1,
        senderName: "알고마스터",
        content: "오 빠르네요! 저도 Python으로 풀었어요",
        type: "TALK",
        createdAt: new Date(baseTime - 4500000).toISOString(),
      },
      {
        id: "chat-8",
        roomId: Number(studyId),
        senderId: 1,
        senderName: "알고마스터",
        content: "Python 풀이 공유합니다",
        type: "CODE",
        metadata: {
          language: "python",
          problemTitle: "A+B",
          codePreview: "a, b = map(int, input().split())\nprint(a + b)",
        },
        createdAt: new Date(baseTime - 4200000).toISOString(),
      },
      {
        id: "chat-9",
        roomId: Number(studyId),
        senderId: 3,
        senderName: "PS러버",
        content:
          "터렛 문제 조건 분기가 좀 까다롭네요... 경계 조건 처리하는게 핵심인 것 같아요",
        type: "TALK",
        createdAt: new Date(baseTime - 3600000).toISOString(),
      },
      {
        id: "chat-10",
        roomId: Number(studyId),
        senderId: 4,
        senderName: "백준킹",
        content:
          "저도 터렛 풀고 있는데 무한대 출력하는 케이스가 뭔지 모르겠어요 ㅠㅠ",
        type: "TALK",
        createdAt: new Date(baseTime - 3000000).toISOString(),
      },
      {
        id: "chat-11",
        roomId: Number(studyId),
        senderId: 3,
        senderName: "PS러버",
        content:
          "두 원이 완전히 겹칠 때요! d=0이고 r1=r2일 때 -1 출력하면 됩니다",
        type: "TALK",
        parentMessage: {
          id: "chat-10",
          senderId: 4,
          senderName: "백준킹",
          content:
            "저도 터렛 풀고 있는데 무한대 출력하는 케이스가 뭔지 모르겠어요 ㅠㅠ",
          type: "TALK",
        },
        createdAt: new Date(baseTime - 2700000).toISOString(),
      },
      {
        id: "chat-12",
        roomId: Number(studyId),
        senderId: 4,
        senderName: "백준킹",
        content: "아 감사합니다!! 이제 맞았습니다 ㅎㅎ",
        type: "TALK",
        createdAt: new Date(baseTime - 2400000).toISOString(),
      },
      {
        id: "chat-13",
        roomId: Number(studyId),
        senderId: 1,
        senderName: "알고마스터",
        content: "다들 수고하셨어요! 오늘 문제 다 푼 것 같네요",
        type: "TALK",
        createdAt: new Date(baseTime - 1800000).toISOString(),
      },
      {
        id: "chat-14",
        roomId: Number(studyId),
        senderId: 2,
        senderName: "CodeNinja",
        content: "내일은 DP 문제 풀어보면 어떨까요?",
        type: "TALK",
        createdAt: new Date(baseTime - 1200000).toISOString(),
      },
      {
        id: "chat-15",
        roomId: Number(studyId),
        senderId: 1,
        senderName: "알고마스터",
        content: "좋아요! 피보나치 함수 문제 추가해둘게요",
        type: "TALK",
        createdAt: new Date(baseTime - 600000).toISOString(), // 10분 전
      },
    ];
  }

  // --- Submission ---

  async submitSolution(
    studyId: string,
    data: { problemId: number; code: string; language: string },
    userId: number,
  ) {
    // Find StudyProblem by BOJ number
    const studyProblem = await this.studyProblemRepository
      .createQueryBuilder("sp")
      .leftJoin("sp.problem", "ap")
      .where("sp.studyId = :studyId", { studyId })
      .andWhere("ap.number = :number", { number: data.problemId })
      .getOne();

    if (!studyProblem) {
      throw new Error("Problem not found in this study");
    }

    const submission = this.submissionRepository.create({
      studyId: Number(studyId),
      studyProblemId: studyProblem.id,
      userId: userId,
      username: "User" + userId, // Mock username
      language: data.language,
      code: data.code,
      status: "success", // Mock success
      memory: 1024,
      time: 100,
      submittedAt: new Date().toISOString(),
    });

    const saved = await this.submissionRepository.save(submission);

    return {
      success: true,
      submissionId: saved.id,
      earnedPoints: 10,
    };
  }

  async getSubmissionList(
    studyId: string,
    problemId: string,
    page: number,
    size: number,
  ) {
    const studyProblem = await this.studyProblemRepository
      .createQueryBuilder("sp")
      .leftJoin("sp.problem", "ap")
      .where("sp.studyId = :studyId", { studyId })
      .andWhere("ap.number = :number", { number: problemId })
      .getOne();

    if (!studyProblem) return { content: [] };

    const submissions = await this.submissionRepository.find({
      where: { studyProblemId: studyProblem.id, status: "success" },
      take: size,
      skip: page * size,
      order: { submittedAt: "DESC" },
    });

    return {
      content: submissions.map((s) => ({
        userId: s.userId,
        nickname: s.username,
        memory: s.memory,
        executionTime: s.time,
      })),
    };
  }

  async getSubmissionDetail(submissionId: string) {
    const sub = await this.submissionRepository.findOne({
      where: { id: Number(submissionId) },
    });
    if (!sub) return null;
    return {
      submissionId: sub.id,
      code: sub.code,
      language: sub.language,
    };
  }

  async createProblem(
    studyId: string,
    data: { title: string; number: number; tags?: string[] },
  ): Promise<any> {
    // 1. Find or Create AvailableProblem
    let available = await this.availableProblemRepository.findOne({
      where: { number: data.number },
    });

    if (!available) {
      available = this.availableProblemRepository.create({
        number: data.number,
        title: data.title,
        tags: data.tags,
        source: "BOJ",
        tier: 1,
      });
      available = await this.availableProblemRepository.save(available);
    }

    // 2. Check if already added for today
    const todayStr = new Date().toISOString().split("T")[0];
    const existing = await this.studyProblemRepository
      .createQueryBuilder("sp")
      .where("sp.studyId = :studyId", { studyId })
      .andWhere("sp.problem.id = :apId", { apId: available.id })
      .andWhere("sp.createdAt LIKE :date", { date: todayStr + "%" })
      .getOne();

    if (existing) {
      console.log("Problem already added for today, returning existing.");
      return {
        id: existing.id,
        createdAt: existing.createdAt,
        title: available.title,
        number: available.number,
        source: available.source,
        status: "not_started",
        tags: available.tags,
        tier: available.tier,
      };
    }

    // 3. Create StudyProblem
    const studyProblem = this.studyProblemRepository.create({
      studyId: Number(studyId),
      problem: available,
    });
    const saved = await this.studyProblemRepository.save(studyProblem);

    return {
      id: saved.id,
      createdAt: saved.createdAt,
      title: available.title,
      number: available.number,
      source: available.source,
      status: "not_started",
      tags: available.tags,
      tier: available.tier,
    };
  }

  async searchExternalProblems(query: string) {
    const results = await this.availableProblemRepository.find({
      where: [
        { title: Like("%" + query + "%") },
        {
          number: Raw((alias) => "CAST(" + alias + " AS TEXT) LIKE :q", {
            q: "%" + query + "%",
          }),
        },
      ],
    });

    const todayStr = new Date().toISOString().split("T")[0];

    const enrichedResults = await Promise.all(
      results.map(async (p) => {
        // Check generic "today" existence without specific studyId from query
        // Ideally we need studyId context.
        // For now, if ANY study problem exists today for this number, we mark it.
        // Or strictly we should assume this API is called in context of a study.
        // But the signature is generic.
        // Let's assume we are checking "is it in the database for today?".
        // For the "Add Modal" which is inside a Study Room, we usually want to know if it's in THAT room.
        // Current implementation limitation: Without studyId, we can't be perfect.
        // But let's verify against the AvailableProblem only? No, we need `isRegistered`.

        // Quick fix: Assume Study 1 for test or generic check.
        // Let's check if there is ANY StudyProblem for this AvailableProblem today.

        const existingToday = await this.studyProblemRepository
          .createQueryBuilder("sp")
          .leftJoin("sp.problem", "ap")
          .where("ap.number = :number", { number: p.number })
          .andWhere("sp.createdAt LIKE :date", { date: todayStr + "%" })
          .getOne();

        let hasSubmissions = false;
        if (existingToday) {
          const count = await this.submissionRepository.count({
            where: { studyProblemId: existingToday.id },
          });
          hasSubmissions = count > 0;
        }

        return {
          ...p,
          url: "https://www.acmicpc.net/problem/" + p.number,
          isRegistered: !!existingToday,
          registeredId: existingToday ? existingToday.id : null,
          hasSubmissions,
        };
      }),
    );

    return enrichedResults;
  }

  async deleteProblem(studyId: string, problemId: string) {
    // Check if there are any submissions for this study problem
    const submissionCount = await this.submissionRepository.count({
      where: { studyProblemId: Number(problemId) },
    });

    if (submissionCount > 0) {
      throw new Error(
        "Cannot delete problem because there are active submissions.",
      );
    }

    const result = await this.studyProblemRepository.delete(problemId);
    return result;
  }

  async onModuleInit() {
    const availableCount = await this.availableProblemRepository.count();
    if (availableCount === 0) {
      console.log("Seeding available problems...");
      await this.seedAvailableProblems();
    }

    const studyProblemCount = await this.studyProblemRepository.count();
    if (studyProblemCount === 0) {
      console.log("Seeding study problems...");
      await this.seedStudyProblems();
    }
  }

  private async seedAvailableProblems() {
    const mockDb = [
      { number: 1000, title: "A+B", tags: ["Math"], tier: 1, source: "BOJ" },
      { number: 1001, title: "A-B", tags: ["Math"], tier: 1, source: "BOJ" },
      {
        number: 2557,
        title: "Hello World",
        tags: ["Imp"],
        tier: 1,
        source: "BOJ",
      },
      // ... (add more if needed)
    ];

    for (const p of mockDb) {
      await this.availableProblemRepository.save(p);
    }
  }

  private async seedStudyProblems() {
    // Ensure Available Problems exist
    const p1000 = await this.availableProblemRepository.findOne({
      where: { number: 1000 },
    });
    const p2557 = await this.availableProblemRepository.findOne({
      where: { number: 2557 },
    });

    if (p1000) {
      await this.studyProblemRepository.save({ studyId: 1, problem: p1000 });

      // Seed a submission for p1000
      const sp = await this.studyProblemRepository.findOne({
        where: { problem: { id: p1000.id } },
      });
      if (sp) {
        await this.submissionRepository.save({
          studyId: 1,
          studyProblemId: sp.id,
          userId: 1,
          username: "SeedUser",
          language: "Python",
          memory: 100,
          time: 100,
          status: "success",
          code: "print('Seed')",
          submittedAt: new Date().toISOString(),
        });
      }
    }
  }
}
