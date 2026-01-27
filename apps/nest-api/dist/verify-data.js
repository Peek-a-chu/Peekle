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
async function checkAndAdd() {
    await ds.initialize();
    const spRepo = ds.getRepository(study_problem_entity_1.StudyProblem);
    const subRepo = ds.getRepository(submission_entity_1.Submission);
    const sp1000 = await spRepo.findOne({
        where: { studyId: 1, problem: { number: 1000 } },
        relations: ['problem']
    });
    if (sp1000) {
        const count = await subRepo.count({ where: { studyProblemId: sp1000.id } });
        if (count === 0) {
            await subRepo.save({
                studyId: 1,
                studyProblemId: sp1000.id,
                userId: 2,
                username: 'CodeNinja',
                language: 'JavaScript',
                memory: 128,
                time: 50,
                status: 'success',
                code: 'console.log("Verified Deletion Restriction")',
                submittedAt: new Date().toISOString()
            });
            console.log('Added missing submission to problem 1000');
        }
        else {
            console.log(`Problem 1000 already has ${count} submissions`);
        }
    }
    else {
        console.log('Problem 1000 not found in Study 1');
    }
    await ds.destroy();
}
checkAndAdd().catch(console.error);
//# sourceMappingURL=verify-data.js.map