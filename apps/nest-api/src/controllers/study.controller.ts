import { Controller, Get, Post, Param, Query, Body, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { StudyProblem } from '../entities/study-problem.entity';
import { Submission } from '../entities/submission.entity';
import { AvailableProblem } from '../entities/available-problem.entity';

@Controller('api/studies')
export class StudyController {
  constructor(
    @InjectRepository(StudyProblem)
    private studyProblemRepo: Repository<StudyProblem>,
    @InjectRepository(Submission)
    private submissionRepo: Repository<Submission>,
    @InjectRepository(AvailableProblem)
    private availableProblemRepo: Repository<AvailableProblem>,
  ) {}

  @Get(':studyId/curriculum/daily')
  async getDailyProblems(
    @Param('studyId') studyId: number,
    @Query('date') date: string,
  ) {
    // SQLite stores dates as strings or we need to be careful with comparison.
    // The seed saves as Date object but TypeOrm + SQLite might save as string like '2025-01-27 00:00:00.000'
    // Let's try to match by string prefix or date range.
    
    // Simple approach: Fetch all for study, filter by js date
    const problems = await this.studyProblemRepo.find({
      where: { studyId },
      relations: ['problem'],
    });

    const targetDateStr = date; // '2025-10-10'

    const filtered = problems.filter(p => {
        const pDate = new Date(p.createdAt).toISOString().split('T')[0];
        return pDate === targetDateStr;
    });

    // Map to frontend DailyProblem format
    const result = [];
    for (const sp of filtered) {
        // Count solved members (unique users who have submissions with status 'success' for this studyProblemId)
        const successSubmissions = await this.submissionRepo.find({
            where: { studyProblemId: sp.id, status: 'success' },
            select: ['userId']
        });
        const uniqueUsers = new Set(successSubmissions.map(s => s.userId));

        result.push({
            problemId: sp.problem.number,
            title: sp.problem.title,
            tier: this.getTierName(sp.problem.tier),
            solvedMemberCount: uniqueUsers.size,
        });
    }

    return result;
  }

  @Post(':studyId/submit')
  async submitProblem(
    @Param('studyId') studyId: number,
    @Body() body: { problemId: number; code: string },
  ) {
    const { problemId, code } = body;
    
    // Find StudyProblem
    // We need to find the correct StudyProblem ID. 
    // Assuming we pick the latest one for this study/problem number if duplicates exist.
    const studyProblems = await this.studyProblemRepo.find({
      where: { studyId },
      relations: ['problem'],
      order: { createdAt: 'DESC' }
    });
    
    const targetSP = studyProblems.find(sp => sp.problem.number === problemId);

    if (!targetSP) {
        throw new NotFoundException(`Problem ${problemId} not found in study ${studyId}`);
    }

    // Create Submission
    // Mock user
    const userId = 1; 
    const username = 'DevUser';

    const submission = this.submissionRepo.create({
        studyId,
        studyProblemId: targetSP.id,
        userId,
        username,
        language: 'JavaScript', // Mock
        memory: Math.floor(Math.random() * 50000) + 1000,
        time: Math.floor(Math.random() * 200) + 10,
        status: 'success', // Always success for now
        code: code,
        submittedAt: new Date().toISOString()
    });

    await this.submissionRepo.save(submission);

    return {
        success: true,
        message: 'Submitted successfully'
    };
  }

  @Get(':studyId')
  async getStudyDetail(@Param('studyId') studyId: number) {
      // Mock data
      return {
          id: studyId,
          title: `Study Group ${studyId}`,
          members: [
              { userId: 1, nickname: '알고마스터' },
              { userId: 2, nickname: 'CodeNinja' },
              { userId: 3, nickname: 'PS러버' },
              { userId: 4, nickname: '백준킹' }
          ]
      };
  }
  
  // Helper
  private getTierName(level: number): string {
    if (!level || level === 0) return 'Unrated';
    const tiers = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Ruby'];
    const tierIndex = Math.floor((level - 1) / 5);
    const tierRank = 5 - ((level - 1) % 5);

    if (tierIndex < 0) return 'Unrated';
    if (tierIndex >= tiers.length) return 'Master';

    return `${tiers[tierIndex]} ${tierRank}`;
  }
}
