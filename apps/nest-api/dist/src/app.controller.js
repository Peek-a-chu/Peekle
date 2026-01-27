"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppController = void 0;
const common_1 = require("@nestjs/common");
const app_service_1 = require("./app.service");
let AppController = class AppController {
    constructor(appService) {
        this.appService = appService;
    }
    getHello() {
        return this.appService.getHello();
    }
    getStudyRooms() {
        return [
            { id: 1, title: 'Test Room 1' },
            { id: 2, title: 'Test Room 2' },
        ];
    }
    getProblems(studyId, date) {
        return this.appService.getProblems(studyId, date);
    }
    getProblemDates(studyId) {
        return this.appService.getProblemDates(studyId);
    }
    getSubmissions(studyId, problemId) {
        return this.appService.getSubmissions(studyId, problemId);
    }
    getParticipants(studyId) {
        return this.appService.getParticipants(studyId);
    }
    getChats(studyId) {
        return this.appService.getChats(studyId);
    }
    getStudyRoom(studyId) {
        return this.appService.getStudyRoom(studyId);
    }
    createProblem(studyId, body) {
        return this.appService.createProblem(studyId, body);
    }
    searchExternalProblems(query) {
        return this.appService.searchExternalProblems(query);
    }
    async deleteProblem(studyId, problemId) {
        try {
            return await this.appService.deleteProblem(studyId, problemId);
        }
        catch (error) {
            return {
                success: false,
                message: error.message
            };
        }
    }
};
exports.AppController = AppController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", String)
], AppController.prototype, "getHello", null);
__decorate([
    (0, common_1.Get)('study/rooms'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AppController.prototype, "getStudyRooms", null);
__decorate([
    (0, common_1.Get)('study/:studyId/problems'),
    __param(0, (0, common_1.Param)('studyId')),
    __param(1, (0, common_1.Query)('date')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "getProblems", null);
__decorate([
    (0, common_1.Get)('study/:studyId/problems/dates'),
    __param(0, (0, common_1.Param)('studyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "getProblemDates", null);
__decorate([
    (0, common_1.Get)('study/:studyId/problems/:problemId/submissions'),
    __param(0, (0, common_1.Param)('studyId')),
    __param(1, (0, common_1.Param)('problemId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "getSubmissions", null);
__decorate([
    (0, common_1.Get)('study/:studyId/participants'),
    __param(0, (0, common_1.Param)('studyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "getParticipants", null);
__decorate([
    (0, common_1.Get)('study/:studyId/chats'),
    __param(0, (0, common_1.Param)('studyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "getChats", null);
__decorate([
    (0, common_1.Get)('study/:studyId'),
    __param(0, (0, common_1.Param)('studyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "getStudyRoom", null);
__decorate([
    (0, common_1.Post)('study/:studyId/problems'),
    __param(0, (0, common_1.Param)('studyId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "createProblem", null);
__decorate([
    (0, common_1.Get)('external/search'),
    __param(0, (0, common_1.Query)('query')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "searchExternalProblems", null);
__decorate([
    (0, common_1.Delete)('study/:studyId/problems/:problemId'),
    __param(0, (0, common_1.Param)('studyId')),
    __param(1, (0, common_1.Param)('problemId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "deleteProblem", null);
exports.AppController = AppController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [app_service_1.AppService])
], AppController);
//# sourceMappingURL=app.controller.js.map