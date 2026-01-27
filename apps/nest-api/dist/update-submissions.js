"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_1 = require("typeorm");
const available_problem_entity_1 = require("./src/entities/available-problem.entity");
const study_problem_entity_1 = require("./src/entities/study-problem.entity");
const submission_entity_1 = require("./src/entities/submission.entity");
const study_problem_participant_entity_1 = require("./src/entities/study-problem-participant.entity");
const ds = new typeorm_1.DataSource({
    type: 'sqlite',
    database: 'peekle.sqlite',
    entities: [available_problem_entity_1.AvailableProblem, study_problem_entity_1.StudyProblem, submission_entity_1.Submission, study_problem_participant_entity_1.StudyProblemParticipant],
});
async function addSubmissions() {
    await ds.initialize();
    const spRepo = ds.getRepository(study_problem_entity_1.StudyProblem);
    const subRepo = ds.getRepository(submission_entity_1.Submission);
    await subRepo.clear();
    const sps = await spRepo.find({ relations: ['problem'] });
    for (const sp of sps) {
        if (sp.studyId === 1) {
            if (sp.problem.number === 1000) {
                await subRepo.save([
                    { studyId: 1, studyProblemId: sp.id, userId: 1, username: '알고마스터', language: 'Python', status: 'success', memory: 128, time: 40, code: 'print()', submittedAt: new Date().toISOString() },
                    { studyId: 1, studyProblemId: sp.id, userId: 2, username: 'CodeNinja', language: 'JavaScript', status: 'success', memory: 256, time: 60, code: 'console.log()', submittedAt: new Date().toISOString() },
                ]);
            }
            else if (sp.problem.number === 1001) {
                await subRepo.save({ studyId: 1, studyProblemId: sp.id, userId: 3, username: 'PS러버', language: 'C++', status: 'success', memory: 64, time: 20, code: 'cout', submittedAt: new Date().toISOString() });
            }
            else if (sp.problem.number === 1002) {
                await subRepo.save([
                    { studyId: 1, studyProblemId: sp.id, userId: 1, username: '알고마스터', language: 'Python', status: 'success', memory: 128, time: 40, code: '...', submittedAt: new Date().toISOString() },
                    { studyId: 1, studyProblemId: sp.id, userId: 2, username: 'CodeNinja', language: 'JavaScript', status: 'success', memory: 256, time: 60, code: '...', submittedAt: new Date().toISOString() },
                    { studyId: 1, studyProblemId: sp.id, userId: 4, username: '백준킹', language: 'Java', status: 'success', memory: 512, time: 100, code: '...', submittedAt: new Date().toISOString() },
                ]);
            }
        }
    }
    console.log('Successfully updated submissions for participant counts');
    await ds.destroy();
}
addSubmissions().catch(console.error);
//# sourceMappingURL=update-submissions.js.map