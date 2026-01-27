import { OnModuleInit } from "@nestjs/common";
import { Repository } from "typeorm";
import { Submission } from "./entities/submission.entity";
import { AvailableProblem } from "./entities/available-problem.entity";
import { EventsGateway } from "./sockets/events.gateway";
import { StudyProblem } from "./entities/study-problem.entity";
import { StudyProblemParticipant } from "./entities/study-problem-participant.entity";
export declare class AppService implements OnModuleInit {
    private submissionRepository;
    private availableProblemRepository;
    private studyProblemRepository;
    private studyProblemParticipantRepository;
    private eventsGateway;
    constructor(submissionRepository: Repository<Submission>, availableProblemRepository: Repository<AvailableProblem>, studyProblemRepository: Repository<StudyProblem>, studyProblemParticipantRepository: Repository<StudyProblemParticipant>, eventsGateway: EventsGateway);
    getHello(): string;
    getProblems(studyId: string, date: string): Promise<any[]>;
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
    getChats(studyId: string): Promise<any[]>;
    createProblem(studyId: string, data: {
        title: string;
        number: number;
        tags?: string[];
    }): Promise<any>;
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
    private seedStudyProblems;
}
