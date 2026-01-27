import { Injectable, OnModuleInit } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Raw, Like } from "typeorm";
import { Submission } from "./entities/submission.entity";
import { AvailableProblem } from "./entities/available-problem.entity";
import { SocketService } from "./sockets/socket.service";
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
    private socketService: SocketService,
  ) {}

  getHello(): string {
    return "Hello World From NestJS!";
  }

  async getProblems(studyId: string, date: string): Promise<any[]> {
        console.log('Getting problems for date: ' + date);
        
        // Query StudyProblem with AvailableProblem relation
        const query = this.studyProblemRepository.createQueryBuilder("sp")
          .leftJoinAndSelect("sp.problem", "ap")
          .where("sp.studyId = :studyId", { studyId })
          .orderBy("sp.createdAt", "DESC");
    
        const studyProblems = await query.getMany();
        console.log('Found ' + studyProblems.length + ' study problems total.');
    
        let filtered = studyProblems;
        if (date) {
            filtered = studyProblems.filter(p => {
                 let pDateStr = '';
                 if (p.createdAt instanceof Date) {
                     pDateStr = p.createdAt.toISOString().split('T')[0];
                 } else {
                     pDateStr = String(p.createdAt).split('T')[0].split(' ')[0];
                 }
                 return pDateStr === date;
            });
            console.log('Filtered down to ' + filtered.length + ' problems for date ' + date);
        }
    // Map to Frontend Problem Shape
    const totalParticipants = (await this.getParticipants(studyId)).length;

    const enriched = await Promise.all(filtered.map(async (sp) => {
      const solvedCount = await this.submissionRepository
        .createQueryBuilder("sub")
        .where("sub.studyProblemId = :spId", { spId: sp.id })
        .andWhere("sub.status = :status", { status: 'success' })
        .select("DISTINCT sub.userId")
        .getCount();

      return {
        id: sp.id, // StudyProblem ID
        createdAt: sp.createdAt,
        title: sp.problem.title,
        number: sp.problem.number,
        source: sp.problem.source,
        status: solvedCount > 0 ? 'success' : 'not_started', // Simple heuristic
        tags: sp.problem.tags,
        participantCount: solvedCount, 
        totalParticipants: totalParticipants,
        url: 'https://www.acmicpc.net/problem/' + sp.problem.number,
        tier: sp.problem.tier,
      };
    }));

    return enriched;
  }

  async getProblemDates(studyId: string): Promise<string[]> {
    const result = await this.studyProblemRepository
      .createQueryBuilder("sp")
      .select("sp.createdAt")
      .where("sp.studyId = :studyId", { studyId })
      .getMany();

    const dates = new Set<string>();
    result.forEach((p) => {
      if (p.createdAt && p.createdAt instanceof Date) {
        dates.add(p.createdAt.toISOString().split("T")[0]);
      } else if (typeof p.createdAt === "string") {
        dates.add((p.createdAt as string).split("T")[0].split(" ")[0]);
      }
    });
    return Array.from(dates).sort();
  }

  async getSubmissions(
    studyId: string,
    problemId: string, // This is StudyProblem ID
  ): Promise<Submission[]> {
    return this.submissionRepository.find({
      where: { studyProblemId: Number(problemId) },
      order: { submittedAt: "DESC" },
    });
  }

  async getParticipants(studyId: string) {
    // Mock participants data moved from frontend
    return [
      {
        id: 1,
        odUid: "user1",
        nickname: "알고마스터",
        isOwner: true,
        isMuted: false,
        isVideoOff: false,
        isOnline: true,
        lastSpeakingAt: Date.now() - 1000,
      },
      {
        id: 2,
        odUid: "user2",
        nickname: "CodeNinja (Bot)",
        isOwner: false,
        isMuted: false,
        isVideoOff: false,
        isOnline: true,
        lastSpeakingAt: Date.now() - 5000,
      },
      {
        id: 3,
        odUid: "user3",
        nickname: "PS러버 (Bot)",
        isOwner: false,
        isMuted: true,
        isVideoOff: false,
        isOnline: true,
        lastSpeakingAt: Date.now() - 10000,
      },
      {
        id: 4,
        odUid: "user4",
        nickname: "백준킹",
        isOwner: false,
        isMuted: true,
        isVideoOff: true,
        isOnline: false,
      },
    ];
  }

  async getStudyRoom(studyId: string) {
    return {
      roomId: Number(studyId),
      roomTitle: "알고리즘 마스터 스터디",
      roomDescription: "매주 월/수/금 알고리즘 문제를 함께 풀어요!",
      inviteCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
    };
  }

  async getChats(studyId: string): Promise<any[]> {
    return [
      {
        id: "chat-1",
        roomId: Number(studyId),
        senderId: 2,
        senderName: "CodeNinja (Bot)",
        content: "안녕하세요! 오늘 풀 문제는 무엇인가요?",
        type: "TALK",
        createdAt: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: "chat-2",
        roomId: Number(studyId),
        senderId: 3,
        senderName: "PS러버 (Bot)",
        content: "오늘은 BFS/DFS 위주로 풀어보고 싶어요.",
        type: "TALK",
        createdAt: new Date(Date.now() - 3000000).toISOString(),
      },
      {
        id: "chat-3",
        roomId: Number(studyId),
        senderId: 1,
        senderName: "알고마스터",
        content: "좋습니다. 오늘 문제 리스트에 추가해두었습니다!",
        type: "TALK",
        createdAt: new Date(Date.now() - 2400000).toISOString(),
      },
      {
        id: "chat-4",
        roomId: Number(studyId),
        senderId: 2,
        senderName: "CodeNinja (Bot)",
        content: "감사합니다! 바로 확인해볼게요.",
        type: "TALK",
        parentMessage: {
          id: "chat-3",
          senderId: 1,
          senderName: "알고마스터",
          content: "좋습니다. 오늘 문제 리스트에 추가해두었습니다!",
          type: "TALK",
        },
        createdAt: new Date(Date.now() - 1800000).toISOString(),
      },
    ];
  }

  async createProblem(
    studyId: string,
    data: { title: string; number: number; tags?: string[] },
  ): Promise<any> {
    // 1. Find or Create AvailableProblem
    let available = await this.availableProblemRepository.findOne({ where: { number: data.number } });
    
    if (!available) {
        available = this.availableProblemRepository.create({
            number: data.number,
            title: data.title,
            tags: data.tags,
            source: 'BOJ',
            tier: 1
        });
        available = await this.availableProblemRepository.save(available);
    }

    // 2. Check if already added for today
    const todayStr = new Date().toISOString().split('T')[0];
    const existing = await this.studyProblemRepository.createQueryBuilder("sp")
        .where("sp.studyId = :studyId", { studyId })
        .andWhere("sp.problem.id = :apId", { apId: available.id })
        .andWhere("sp.createdAt LIKE :date", { date: todayStr + '%' })
        .getOne();

    if (existing) {
        console.log("Problem already added for today, returning existing.");
        return {
            id: existing.id,
            createdAt: existing.createdAt,
            title: available.title,
            number: available.number,
            source: available.source,
            status: 'not_started',
            tags: available.tags,
            tier: available.tier
        };
    }

    // 3. Create StudyProblem
    const studyProblem = this.studyProblemRepository.create({
        studyId: Number(studyId),
        problem: available
    });
    const saved = await this.studyProblemRepository.save(studyProblem);

    this.socketService.notifyProblemUpdate(studyId);

    return {
      id: saved.id,
      createdAt: saved.createdAt,
      title: available.title,
      number: available.number,
      source: available.source,
      status: 'not_started',
      tags: available.tags,
      tier: available.tier
    };
  }

  async searchExternalProblems(query: string) {
    const results = await this.availableProblemRepository.find({
      where: [
        { title: Like('%' + query + '%') },
        {
          number: Raw((alias) => 'CAST(' + alias + ' AS TEXT) LIKE :q', {
            q: '%' + query + '%',
          }),
        },
      ],
    });

    const todayStr = new Date().toISOString().split('T')[0];

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
        
        const existingToday = await this.studyProblemRepository.createQueryBuilder("sp")
            .leftJoin("sp.problem", "ap")
            .where("ap.number = :number", { number: p.number })
            .andWhere("sp.createdAt LIKE :date", { date: todayStr + '%' })
            .getOne();

        let hasSubmissions = false;
        if (existingToday) {
            const count = await this.submissionRepository.count({
                where: { studyProblemId: existingToday.id }
            });
            hasSubmissions = count > 0;
        }

        return {
          ...p,
          url: 'https://www.acmicpc.net/problem/' + p.number,
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
      where: { studyProblemId: Number(problemId) }
    });

    if (submissionCount > 0) {
      throw new Error("Cannot delete problem because there are active submissions.");
    }

    const result = await this.studyProblemRepository.delete(problemId);
    this.socketService.notifyProblemUpdate(studyId);
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
      { number: 2557, title: "Hello World", tags: ["Imp"], tier: 1, source: "BOJ" },
      // ... (add more if needed)
    ];

    for (const p of mockDb) {
      await this.availableProblemRepository.save(p);
    }
  }

  private async seedStudyProblems() {
    // Ensure Available Problems exist
    const p1000 = await this.availableProblemRepository.findOne({ where: { number: 1000 } });
    const p2557 = await this.availableProblemRepository.findOne({ where: { number: 2557 } });

    if (p1000) {
        await this.studyProblemRepository.save({ studyId: 1, problem: p1000 });
        
        // Seed a submission for p1000
        const sp = await this.studyProblemRepository.findOne({ where: { problem: { id: p1000.id } } });
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
                submittedAt: new Date().toISOString()
            });
        }
    }
  }
}