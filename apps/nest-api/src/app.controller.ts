import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Delete,
} from "@nestjs/common";
import { AppService } from "./app.service";
import { SocketService } from "./sockets/socket.service";

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly socketService: SocketService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  // --- A. Study Room Management ---

  @Post("studies")
  createStudy(@Body() body: { title: string }) {
    return this.appService.createStudy(body.title);
  }

  @Post("studies/join")
  joinStudy(@Body() body: { inviteCode: string }) {
    // Assuming userId is 1 for now
    const mockUserId = 1;
    return this.appService.joinStudy(body.inviteCode, mockUserId);
  }

  @Post("studies/:id/invite")
  createInviteCode(@Param("id") id: string) {
    return this.appService.createInviteCode(id);
  }

  @Get("studies")
  getMyStudies(
    @Query("page") page: number = 0,
    @Query("keyword") keyword: string,
  ) {
    const mockUserId = 1;
    return this.appService.getMyStudies(mockUserId, page, keyword);
  }

  @Get("studies/:id")
  getStudyDetail(@Param("id") id: string) {
    return this.appService.getStudyDetail(id);
  }

  // --- B. Chat ---

  @Get("studies/:id/chats")
  getChats(@Param("id") id: string, @Query("page") page: number = 0) {
    return this.appService.getChats(id, page);
  }

  // --- C. Curriculum ---

  @Get("studies/:id/curriculum/daily")
  getDailyCurriculum(@Param("id") id: string, @Query("date") date: string) {
    return this.appService.getDailyCurriculum(id, date);
  }

  // --- D. Submission ---

  @Post("studies/:studyId/submit")
  submitSolution(
    @Param("studyId") studyId: string,
    @Body() body: { problemId: number; code: string; language: string },
  ) {
    const mockUserId = 1;
    return this.appService.submitSolution(studyId, body, mockUserId);
  }

  @Get("submissions/study/:studyId/problem/:problemId")
  getSubmissionList(
    @Param("studyId") studyId: string,
    @Param("problemId") problemId: string,
    @Query("page") page: number = 0,
    @Query("size") size: number = 5,
  ) {
    return this.appService.getSubmissionList(studyId, problemId, page, size);
  }

  @Get("submissions/:submissionId")
  getSubmissionDetail(@Param("submissionId") submissionId: string) {
    return this.appService.getSubmissionDetail(submissionId);
  }

  // --- Legacy / Helper / Other ---

  @Get("studies/:studyId/participants")
  getParticipants(@Param("studyId") studyId: string) {
    return this.appService.getParticipants(studyId);
  }

  @Post("studies/:studyId/problems")
  async createProblem(
    @Param("studyId") studyId: string,
    @Body() body: { title: string; number: number; tags?: string[] },
  ) {
    const result = await this.appService.createProblem(studyId, body);
    try {
      this.socketService.notifyProblemUpdate(studyId);
    } catch (e) {
      console.error("Socket notification failed:", e);
    }
    return result;
  }

  @Get("external/search")
  searchExternalProblems(@Query("query") query: string) {
    return this.appService.searchExternalProblems(query);
  }

  @Delete("studies/:studyId/problems/:problemId")
  async deleteProblem(
    @Param("studyId") studyId: string,
    @Param("problemId") problemId: string,
  ) {
    try {
      const result = await this.appService.deleteProblem(studyId, problemId);
      try {
        this.socketService.notifyProblemUpdate(studyId);
      } catch (e) {
        console.error("Socket notification failed:", e);
      }
      return result;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
