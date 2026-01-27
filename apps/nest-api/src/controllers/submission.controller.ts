import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Submission } from '../entities/submission.entity';
import { StudyProblem } from '../entities/study-problem.entity';

@Controller('submissions')
export class SubmissionController {
  constructor(
    @InjectRepository(Submission)
    private submissionRepo: Repository<Submission>,
    @InjectRepository(StudyProblem)
    private studyProblemRepo: Repository<StudyProblem>,
  ) {}

  @Get('study/:studyId/problem/:problemId')
  async getProblemSubmissions(
    @Param('studyId') studyId: number,
    @Param('problemId') problemId: number,
  ) {
    // 1. Find StudyProblem(s) matching the BOJ number
    // It's possible the same problem appears multiple days. 
    // Usually we want submissions for *this* context. 
    // The API spec implies fetching "Submissions for this problem in this study".
    // We should probably include all submissions for this problem number in this study 
    // regardless of which "Curriculum Date" it was assigned to.
    
    // Join StudyProblem -> AvailableProblem to filter by number
    const studyProblems = await this.studyProblemRepo.find({
        where: { studyId },
        relations: ['problem']
    });

    const targetIds = studyProblems
        .filter(sp => sp.problem.number == problemId)
        .map(sp => sp.id);

    if (targetIds.length === 0) {
        return [];
    }

    // 2. Fetch submissions for these studyProblemIds
    // SQLite doesn't support basic array query easily in TypeORM basic find without In
    // Let's iterate or use query builder if complex. Or just repo.find with In
    // import { In } from 'typeorm';

    /*
    const submissions = await this.submissionRepo.find({
        where: { studyProblemId: In(targetIds), status: 'success' }
    });
    */
   
    // Manual loop for safety without 'In' import yet or query builder
    let allSubmissions: Submission[] = [];
    for (const spId of targetIds) {
        const subs = await this.submissionRepo.find({
            where: { studyProblemId: spId, status: 'success' }
        });
        allSubmissions = allSubmissions.concat(subs);
    }

    // 3. Map to response
    return allSubmissions.map(sub => ({
        submissionId: sub.id, // Needed for detail view
        userId: sub.userId,
        nickname: sub.username || "Unknown",
        memory: sub.memory,
        executionTime: sub.time,
        language: sub.language || 'unknown',
        solvedAt: sub.submittedAt || new Date().toISOString()
    }));
  }

  @Get(':submissionId')
  async getSubmissionDetail(@Param('submissionId') submissionId: number) {
      const sub = await this.submissionRepo.findOneBy({ id: submissionId });
      if (!sub) {
          throw new NotFoundException('Submission not found');
      }
      return {
          submissionId: sub.id,
          code: sub.code,
          language: sub.language
      };
  }
}
