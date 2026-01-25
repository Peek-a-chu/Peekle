"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const problem_entity_1 = require("./entities/problem.entity");
const submission_entity_1 = require("./entities/submission.entity");
const available_problem_entity_1 = require("./entities/available-problem.entity");
let AppService = class AppService {
    constructor(problemRepository, submissionRepository, availableProblemRepository) {
        this.problemRepository = problemRepository;
        this.submissionRepository = submissionRepository;
        this.availableProblemRepository = availableProblemRepository;
    }
    getHello() {
        return "Hello World From NestJS!";
    }
    async getProblems(studyId, date) {
        if (date) {
            return this.problemRepository.find({
                where: {
                    createdAt: (0, typeorm_2.Raw)((alias) => `${alias} LIKE :date`, {
                        date: `${date}%`,
                    }),
                },
                order: { createdAt: "DESC" },
            });
        }
        return this.problemRepository.find({ order: { createdAt: "DESC" } });
    }
    async getProblemDates(studyId) {
        const result = await this.problemRepository
            .createQueryBuilder("problem")
            .select("problem.createdAt")
            .getMany();
        const dates = new Set();
        result.forEach((p) => {
            if (p.createdAt && p.createdAt instanceof Date) {
                dates.add(p.createdAt.toISOString().split("T")[0]);
            }
            else if (typeof p.createdAt === "string") {
                dates.add(p.createdAt.split("T")[0].split(" ")[0]);
            }
        });
        return Array.from(dates).sort();
    }
    async getSubmissions(studyId, problemId) {
        return this.submissionRepository.find({
            where: { problemId: Number(problemId) },
            order: { submittedAt: "DESC" },
        });
    }
    async getParticipants(studyId) {
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
    async getStudyRoom(studyId) {
        return {
            roomId: Number(studyId),
            roomTitle: "알고리즘 마스터 스터디",
            roomDescription: "매주 월/수/금 알고리즘 문제를 함께 풀어요!",
            inviteCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
        };
    }
    async createProblem(studyId, data) {
        const newProblem = this.problemRepository.create({
            title: data.title,
            number: data.number,
            source: `BOJ ${data.number}`,
            url: `https://www.acmicpc.net/problem/${data.number}`,
            status: "not_started",
            tier: 1,
            tags: data.tags || [],
        });
        return this.problemRepository.save(newProblem);
    }
    async searchExternalProblems(query) {
        const results = await this.availableProblemRepository.find({
            where: [
                { title: (0, typeorm_2.Like)(`%${query}%`) },
                {
                    number: (0, typeorm_2.Raw)((alias) => `CAST(${alias} AS TEXT) LIKE :q`, {
                        q: `%${query}%`,
                    }),
                },
            ],
        });
        const enrichedResults = await Promise.all(results.map(async (p) => {
            const existing = await this.problemRepository.findOne({
                where: { number: p.number },
            });
            let hasSubmissions = false;
            if (existing) {
                const count = await this.submissionRepository.count({
                    where: { problemId: existing.id },
                });
                hasSubmissions = count > 0;
            }
            return {
                ...p,
                url: `https://www.acmicpc.net/problem/${p.number}`,
                isRegistered: !!existing,
                registeredId: existing ? existing.id : null,
                hasSubmissions,
            };
        }));
        return enrichedResults;
    }
    async deleteProblem(studyId, problemId) {
        return this.problemRepository.delete(problemId);
    }
    async onModuleInit() {
        const availableCount = await this.availableProblemRepository.count();
        if (availableCount === 0) {
            console.log("Seeding available problems into SQLite...");
            await this.seedAvailableProblems();
        }
        const count = await this.problemRepository.count();
        if (count === 0) {
            console.log("Seeding initial data into SQLite...");
            await this.seedData();
        }
    }
    async seedAvailableProblems() {
        const mockDb = [
            {
                number: 1000,
                title: "A+B",
                tags: ["Math", "Implementation"],
                tier: 1,
                source: "BOJ",
            },
            {
                number: 1001,
                title: "A-B",
                tags: ["Math", "Implementation"],
                tier: 1,
                source: "BOJ",
            },
            {
                number: 1753,
                title: "최단경로",
                tags: ["Graph", "Dijkstra"],
                tier: 12,
                source: "BOJ",
            },
            {
                number: 1260,
                title: "DFS와 BFS",
                tags: ["Graph", "Search"],
                tier: 10,
                source: "BOJ",
            },
            {
                number: 2557,
                title: "Hello World",
                tags: ["Implementation"],
                tier: 1,
                source: "BOJ",
            },
            {
                number: 12865,
                title: "평범한 배낭",
                tags: ["DP", "Knapsack"],
                tier: 11,
                source: "BOJ",
            },
            { number: 1149, title: "RGB거리", tags: ["DP"], tier: 8, source: "BOJ" },
            {
                number: 2798,
                title: "블랙잭",
                tags: ["Brute Force"],
                tier: 5,
                source: "BOJ",
            },
            {
                number: 1920,
                title: "수 찾기",
                tags: ["Binary Search", "Sorting"],
                tier: 7,
                source: "BOJ",
            },
            {
                number: 1655,
                title: "가운데를 말해요",
                tags: ["Priority Queue"],
                tier: 13,
                source: "BOJ",
            },
        ];
        for (const p of mockDb) {
            await this.availableProblemRepository.save(p);
        }
    }
    async seedData() {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const twoDaysAgo = new Date(today);
        twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
        const problems = [
            {
                title: "Two Sum",
                number: 1000,
                source: "BOJ",
                status: "completed",
                tags: ["Array", "Hash Table"],
                participantCount: 3,
                totalParticipants: 4,
                url: "https://www.acmicpc.net/problem/1",
                tier: 1,
                createdAt: today,
            },
            {
                title: "Add Two Numbers",
                number: 1001,
                source: "BOJ",
                status: "in_progress",
                tags: ["LinkedList", "Math"],
                participantCount: 1,
                totalParticipants: 4,
                url: "https://www.acmicpc.net/problem/2",
                tier: 2,
                createdAt: yesterday,
            },
            {
                title: "Longest Substring Without Repeating Characters",
                number: 1002,
                source: "Programmers",
                status: "not_started",
                tags: ["Sliding Window"],
                participantCount: 0,
                totalParticipants: 4,
                url: "https://school.programmers.co.kr/learn/courses/30/lessons/1",
                tier: 3,
                createdAt: twoDaysAgo,
            },
        ];
        const savedProblems = [];
        for (const p of problems) {
            savedProblems.push(await this.problemRepository.save(p));
        }
        const submissions = [
            {
                studyId: 1,
                problemId: savedProblems[0].id,
                userId: 1,
                username: "UserA",
                language: "Python",
                memory: 12000,
                time: 80,
                status: "success",
                submittedAt: new Date().toISOString(),
            },
            {
                studyId: 1,
                problemId: savedProblems[0].id,
                userId: 2,
                username: "UserB",
                language: "Java",
                memory: 24000,
                time: 150,
                status: "fail",
                submittedAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
            },
            {
                studyId: 1,
                problemId: savedProblems[0].id,
                userId: 1,
                username: "CodeNinja",
                language: "Python 3",
                memory: 35020,
                time: 142,
                status: "success",
                code: 'def solve():\n    print("Hello World")',
                submittedAt: new Date().toISOString(),
            },
            {
                studyId: 1,
                problemId: savedProblems[0].id,
                userId: 2,
                username: "백준킹",
                language: "Java",
                memory: 70144,
                time: 256,
                status: "success",
                code: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello");\n    }\n}',
                submittedAt: new Date(Date.now() - 3600000).toISOString(),
            },
            {
                studyId: 1,
                problemId: savedProblems[0].id,
                userId: 3,
                username: "AlgorithmHacker",
                language: "Python 3",
                memory: 31846,
                time: 112,
                status: "success",
                code: "print(sum(map(int, input().split())))",
                submittedAt: new Date(Date.now() - 7200000).toISOString(),
            },
        ];
        for (const s of submissions) {
            await this.submissionRepository.save(s);
        }
        console.log("Seeding complete.");
    }
};
exports.AppService = AppService;
exports.AppService = AppService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(problem_entity_1.Problem)),
    __param(1, (0, typeorm_1.InjectRepository)(submission_entity_1.Submission)),
    __param(2, (0, typeorm_1.InjectRepository)(available_problem_entity_1.AvailableProblem)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], AppService);
//# sourceMappingURL=app.service.js.map