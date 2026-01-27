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
const submission_entity_1 = require("./entities/submission.entity");
const available_problem_entity_1 = require("./entities/available-problem.entity");
const events_gateway_1 = require("./sockets/events.gateway");
const study_problem_entity_1 = require("./entities/study-problem.entity");
const study_problem_participant_entity_1 = require("./entities/study-problem-participant.entity");
let AppService = class AppService {
    constructor(submissionRepository, availableProblemRepository, studyProblemRepository, studyProblemParticipantRepository, eventsGateway) {
        this.submissionRepository = submissionRepository;
        this.availableProblemRepository = availableProblemRepository;
        this.studyProblemRepository = studyProblemRepository;
        this.studyProblemParticipantRepository = studyProblemParticipantRepository;
        this.eventsGateway = eventsGateway;
    }
    getHello() {
        return "Hello World From NestJS!";
    }
    async getProblems(studyId, date) {
        console.log('Getting problems for date: ' + date);
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
                }
                else {
                    pDateStr = String(p.createdAt).split('T')[0].split(' ')[0];
                }
                return pDateStr === date;
            });
            console.log('Filtered down to ' + filtered.length + ' problems for date ' + date);
        }
        const totalParticipants = (await this.getParticipants(studyId)).length;
        const enriched = await Promise.all(filtered.map(async (sp) => {
            const solvedCount = await this.submissionRepository
                .createQueryBuilder("sub")
                .where("sub.studyProblemId = :spId", { spId: sp.id })
                .andWhere("sub.status = :status", { status: 'success' })
                .select("DISTINCT sub.userId")
                .getCount();
            return {
                id: sp.id,
                createdAt: sp.createdAt,
                title: sp.problem.title,
                number: sp.problem.number,
                source: sp.problem.source,
                status: solvedCount > 0 ? 'success' : 'not_started',
                tags: sp.problem.tags,
                participantCount: solvedCount,
                totalParticipants: totalParticipants,
                url: 'https://www.acmicpc.net/problem/' + sp.problem.number,
                tier: sp.problem.tier,
            };
        }));
        return enriched;
    }
    async getProblemDates(studyId) {
        const result = await this.studyProblemRepository
            .createQueryBuilder("sp")
            .select("sp.createdAt")
            .where("sp.studyId = :studyId", { studyId })
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
            where: { studyProblemId: Number(problemId) },
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
    async getChats(studyId) {
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
    async createProblem(studyId, data) {
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
        const studyProblem = this.studyProblemRepository.create({
            studyId: Number(studyId),
            problem: available
        });
        const saved = await this.studyProblemRepository.save(studyProblem);
        this.eventsGateway.notifyProblemUpdate(studyId);
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
    async searchExternalProblems(query) {
        const results = await this.availableProblemRepository.find({
            where: [
                { title: (0, typeorm_2.Like)('%' + query + '%') },
                {
                    number: (0, typeorm_2.Raw)((alias) => 'CAST(' + alias + ' AS TEXT) LIKE :q', {
                        q: '%' + query + '%',
                    }),
                },
            ],
        });
        const todayStr = new Date().toISOString().split('T')[0];
        const enrichedResults = await Promise.all(results.map(async (p) => {
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
        }));
        return enrichedResults;
    }
    async deleteProblem(studyId, problemId) {
        const submissionCount = await this.submissionRepository.count({
            where: { studyProblemId: Number(problemId) }
        });
        if (submissionCount > 0) {
            throw new Error("Cannot delete problem because there are active submissions.");
        }
        const result = await this.studyProblemRepository.delete(problemId);
        this.eventsGateway.notifyProblemUpdate(studyId);
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
    async seedAvailableProblems() {
        const mockDb = [
            { number: 1000, title: "A+B", tags: ["Math"], tier: 1, source: "BOJ" },
            { number: 1001, title: "A-B", tags: ["Math"], tier: 1, source: "BOJ" },
            { number: 2557, title: "Hello World", tags: ["Imp"], tier: 1, source: "BOJ" },
        ];
        for (const p of mockDb) {
            await this.availableProblemRepository.save(p);
        }
    }
    async seedStudyProblems() {
        const p1000 = await this.availableProblemRepository.findOne({ where: { number: 1000 } });
        const p2557 = await this.availableProblemRepository.findOne({ where: { number: 2557 } });
        if (p1000) {
            await this.studyProblemRepository.save({ studyId: 1, problem: p1000 });
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
};
exports.AppService = AppService;
exports.AppService = AppService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(submission_entity_1.Submission)),
    __param(1, (0, typeorm_1.InjectRepository)(available_problem_entity_1.AvailableProblem)),
    __param(2, (0, typeorm_1.InjectRepository)(study_problem_entity_1.StudyProblem)),
    __param(3, (0, typeorm_1.InjectRepository)(study_problem_participant_entity_1.StudyProblemParticipant)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        events_gateway_1.EventsGateway])
], AppService);
//# sourceMappingURL=app.service.js.map