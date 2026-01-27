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
exports.StudyProblemParticipant = void 0;
const typeorm_1 = require("typeorm");
const study_problem_entity_1 = require("./study-problem.entity");
let StudyProblemParticipant = class StudyProblemParticipant {
};
exports.StudyProblemParticipant = StudyProblemParticipant;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], StudyProblemParticipant.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => study_problem_entity_1.StudyProblem),
    (0, typeorm_1.JoinColumn)({ name: 'study_problem_id' }),
    __metadata("design:type", study_problem_entity_1.StudyProblem)
], StudyProblemParticipant.prototype, "studyProblem", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], StudyProblemParticipant.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'not_started' }),
    __metadata("design:type", String)
], StudyProblemParticipant.prototype, "status", void 0);
exports.StudyProblemParticipant = StudyProblemParticipant = __decorate([
    (0, typeorm_1.Entity)()
], StudyProblemParticipant);
//# sourceMappingURL=study-problem-participant.entity.js.map