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
Object.defineProperty(exports, "__esModule", { value: true });
exports.StudyProblem = void 0;
const typeorm_1 = require("typeorm");
const available_problem_entity_1 = require("./available-problem.entity");
const study_problem_participant_entity_1 = require("./study-problem-participant.entity");
let StudyProblem = class StudyProblem {
};
exports.StudyProblem = StudyProblem;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], StudyProblem.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], StudyProblem.prototype, "studyId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => available_problem_entity_1.AvailableProblem),
    (0, typeorm_1.JoinColumn)({ name: 'problem_id' }),
    __metadata("design:type", available_problem_entity_1.AvailableProblem)
], StudyProblem.prototype, "problem", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => study_problem_participant_entity_1.StudyProblemParticipant, participant => participant.studyProblem),
    __metadata("design:type", Array)
], StudyProblem.prototype, "participants", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], StudyProblem.prototype, "createdAt", void 0);
exports.StudyProblem = StudyProblem = __decorate([
    (0, typeorm_1.Entity)()
], StudyProblem);
//# sourceMappingURL=study-problem.entity.js.map