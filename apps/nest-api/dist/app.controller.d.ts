import { AppService } from './app.service';
export declare class AppController {
    private readonly appService;
    constructor(appService: AppService);
    getHello(): string;
    getStudyRooms(): {
        id: number;
        title: string;
    }[];
    getProblems(studyId: string, date: string): Promise<import("./entities/problem.entity").Problem[]>;
    getProblemDates(studyId: string): Promise<string[]>;
    getSubmissions(studyId: string, problemId: string): Promise<import("./entities/submission.entity").Submission[]>;
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
    createProblem(studyId: string, body: {
        title: string;
        number: number;
        tags?: string[];
    }): Promise<import("./entities/problem.entity").Problem>;
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
}
