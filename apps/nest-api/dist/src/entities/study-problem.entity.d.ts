import { AvailableProblem } from './available-problem.entity';
import { StudyProblemParticipant } from './study-problem-participant.entity';
export declare class StudyProblem {
    id: number;
    studyId: number;
    problem: AvailableProblem;
    participants: StudyProblemParticipant[];
    createdAt: Date;
}
