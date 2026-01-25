import { Controller, Get, Post, Body, Param, Query, Delete } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('study/rooms')
  getStudyRooms() {
    return [
      { id: 1, title: 'Test Room 1' },
      { id: 2, title: 'Test Room 2' },
    ];
  }

  @Get('study/:studyId/problems')
  getProblems(@Param('studyId') studyId: string, @Query('date') date: string) {
    return this.appService.getProblems(studyId, date);
  }

  @Get('study/:studyId/problems/dates')
  getProblemDates(@Param('studyId') studyId: string) {
    return this.appService.getProblemDates(studyId);
  }

  @Get('study/:studyId/problems/:problemId/submissions')
  getSubmissions(
    @Param('studyId') studyId: string,
    @Param('problemId') problemId: string,
  ) {
    return this.appService.getSubmissions(studyId, problemId);
  }

  @Get('study/:studyId/participants')
  getParticipants(@Param('studyId') studyId: string) {
    return this.appService.getParticipants(studyId);
  }

  @Get('study/:studyId')
  getStudyRoom(@Param('studyId') studyId: string) {
    return this.appService.getStudyRoom(studyId);
  }

  @Post('study/:studyId/problems')
  createProblem(
    @Param('studyId') studyId: string,
    @Body() body: { title: string; number: number; tags?: string[] },
  ) {
    return this.appService.createProblem(studyId, body);
  }

  @Get('external/search')
  searchExternalProblems(@Query('query') query: string) {
    return this.appService.searchExternalProblems(query);
  }

  @Delete('study/:studyId/problems/:problemId')
  deleteProblem(
    @Param('studyId') studyId: string,
    @Param('problemId') problemId: string,
  ) {
    return this.appService.deleteProblem(studyId, problemId);
  }
}
