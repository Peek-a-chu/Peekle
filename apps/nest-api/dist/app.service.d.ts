import { OnModuleInit } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Problem } from './entities/problem.entity';
import { Submission } from './entities/submission.entity';
export declare class AppService implements OnModuleInit {
    private problemRepository;
    private submissionRepository;
    constructor(problemRepository: Repository<Problem>, submissionRepository: Repository<Submission>);
    getHello(): string;
    getProblems(studyId: string, date: string): Promise<Problem[]>;
    getProblemDates(studyId: string): Promise<string[]>;
    getSubmissions(studyId: string, problemId: string): Promise<Submission[]>;
    createProblem(studyId: string, data: {
        title: string;
        number: number;
        tags?: string[];
    }): Promise<Problem>;
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
    onModuleInit(): Promise<void>;
    private seedData;
}
