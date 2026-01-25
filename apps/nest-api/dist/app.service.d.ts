import { OnModuleInit } from "@nestjs/common";
import { Repository } from "typeorm";
import { Problem } from "./entities/problem.entity";
import { Submission } from "./entities/submission.entity";
import { AvailableProblem } from "./entities/available-problem.entity";
export declare class AppService implements OnModuleInit {
    private problemRepository;
    private submissionRepository;
    private availableProblemRepository;
    constructor(problemRepository: Repository<Problem>, submissionRepository: Repository<Submission>, availableProblemRepository: Repository<AvailableProblem>);
    getHello(): string;
    getProblems(studyId: string, date: string): Promise<Problem[]>;
    getProblemDates(studyId: string): Promise<string[]>;
    getSubmissions(studyId: string, problemId: string): Promise<Submission[]>;
    getParticipants(studyId: string): Promise<({
        id: number;
        odUid: string;
        nickname: string;
        isOwner: boolean;
        isMuted: boolean;
        isVideoOff: boolean;
        isOnline: boolean;
        lastSpeakingAt: number;
    } | {
        id: number;
        odUid: string;
        nickname: string;
        isOwner: boolean;
        isMuted: boolean;
        isVideoOff: boolean;
        isOnline: boolean;
        lastSpeakingAt?: undefined;
    })[]>;
    getStudyRoom(studyId: string): Promise<{
        roomId: number;
        roomTitle: string;
        roomDescription: string;
        inviteCode: string;
    }>;
    createProblem(studyId: string, data: {
        title: string;
        number: number;
        tags?: string[];
    }): Promise<Problem>;
    searchExternalProblems(query: string): Promise<{
        url: string;
        isRegistered: boolean;
        registeredId: number;
        hasSubmissions: boolean;
        id: number;
        number: number;
        title: string;
        source: string;
        tags: string[];
        tier: number;
    }[]>;
    deleteProblem(studyId: string, problemId: string): Promise<import("typeorm").DeleteResult>;
    onModuleInit(): Promise<void>;
    private seedAvailableProblems;
    private seedData;
}
