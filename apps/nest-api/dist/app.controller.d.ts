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
    createProblem(studyId: string, body: {
        title: string;
        number: number;
        tags?: string[];
    }): Promise<import("./entities/problem.entity").Problem>;
    searchExternalProblems(query: string): Promise<{
        isRegistered: boolean;
        registeredId: number;
        url: string;
        number: number;
        title: string;
        tags: string[];
        tier: number;
        source: string;
    }[]>;
    deleteProblem(studyId: string, problemId: string): Promise<import("typeorm").DeleteResult>;
}
