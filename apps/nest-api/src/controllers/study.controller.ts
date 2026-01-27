import { Controller, Get, Post, Param, Query, Body, NotFoundException, Delete } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { StudyProblem } from '../entities/study-problem.entity';
import { Submission } from '../entities/submission.entity';
import { AvailableProblem } from '../entities/available-problem.entity';
import { randomBytes } from 'crypto';

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

  // A. Study Room Management

  @Post()
  async createStudy(@Body() body: { title: string }) {
    // Mock creation
    return { inviteCode: randomBytes(4).toString('hex').toUpperCase() };
  }

  @Post('join')
  async joinStudy(@Body() body: { inviteCode: string }) {
    // Mock join response
    // In real app, find study by invite code
    return {
      id: 1,
      title: 'Java Algo',
      ownerId: 1, // Mock Owner
      members: [
        { userId: 1, nickname: 'DevUser' },
        { userId: 2, nickname: 'Participant2' }
      ]
    };
  }

  @Post(':id/invite')
  async generateInviteCode(@Param('id') id: number) {
    return { inviteCode: 'NEW' + randomBytes(3).toString('hex').toUpperCase() };
  }

  @Get('my')
  async getMyStudies(
    @Query('page') page = 0,
    @Query('keyword') keyword = '',
  ) {
    // Mock List
    return {
      content: [
        { id: 1, title: 'Java Algo', memberCount: 3 },
        { id: 2, title: 'Python Study', memberCount: 5 }
      ],
      totalPages: 1
    };
  }

  @Get(':id')
  async getStudyDetail(@Param('id') id: number) {
    // Mock Detail
    return {
      id: Number(id),
      title: 'Java Algo',
      members: [
        { userId: 1, nickname: 'DevUser' },
        { userId: 2, nickname: 'GuestUser' }
      ]
    };
  }

  // B. Chat API

  @Get(':id/chats')
  async getChats(@Param('id') id: number, @Query('page') page = 0) {
    // Mock Chat History
    return {
      content: [
        { senderName: 'DevUser', content: 'Hello World', type: 'TALK' },
        { senderName: 'System', content: 'Welcome', type: 'ENTER' }
      ]
    };
  }

  // C. Curriculum

  @Get(':studyId/curriculum/daily')
  async getDailyProblems(
    @Param('studyId') studyId: number,
    @Query('date') date: string,
  ) {
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
        submissionId: submission.id, // submission.id is available after save
        earnedPoints: 10
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
