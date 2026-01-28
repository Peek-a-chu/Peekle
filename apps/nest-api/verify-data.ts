import { DataSource } from 'typeorm';
import { AvailableProblem } from './src/entities/available-problem.entity';
import { StudyProblem } from './src/entities/study-problem.entity';
import { Submission } from './src/entities/submission.entity';
import { StudyProblemParticipant } from './src/entities/study-problem-participant.entity';

const ds = new DataSource({
  type: 'sqlite',
  database: 'peekle.sqlite',
  entities: [AvailableProblem, StudyProblem, Submission, StudyProblemParticipant],
});

async function checkAndAdd() {
  await ds.initialize();
  const spRepo = ds.getRepository(StudyProblem);
  const subRepo = ds.getRepository(Submission);

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
    } else {
      console.log(`Problem 1000 already has ${count} submissions`);
    }
  } else {
    console.log('Problem 1000 not found in Study 1');
  }

  await ds.destroy();
}

checkAndAdd().catch(console.error);
