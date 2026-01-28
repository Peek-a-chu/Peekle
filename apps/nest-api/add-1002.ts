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

async function add1002() {
  await ds.initialize();
  const spRepo = ds.getRepository(StudyProblem);
  const apRepo = ds.getRepository(AvailableProblem);
  const subRepo = ds.getRepository(Submission);

  const studyId = 1;
  const num = 1002;

  // 1. Ensure AvailableProblem exists
  let ap = await apRepo.findOneBy({ number: num });
  if (!ap) {
    ap = await apRepo.save({
      number: num,
      title: '터렛',
      source: 'Baekjoon',
      tags: ['silver3', 'geometry'],
      tier: 8
    });
    console.log('Created AvailableProblem 1002');
  }

  // 2. Add to Study 1 for Today
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  
  const existing = await spRepo.createQueryBuilder('sp')
    .where('sp.studyId = :studyId', { studyId })
    .andWhere('sp.problem_id = :apId', { apId: ap.id })
    .getOne();

  let spId: number;
  if (!existing) {
    const saved = await spRepo.save({
      studyId,
      problem: ap,
      createdAt: today
    });
    spId = saved.id;
    console.log('Added Problem 1002 to Study 1 for today');
  } else {
    spId = existing.id;
    console.log('Problem 1002 already exists in Study 1');
  }

  // 3. Ensure submissions exist to show the count (3/4 solved)
  const solvedCount = await subRepo.count({ where: { studyProblemId: spId } });
  if (solvedCount < 3) {
    await subRepo.delete({ studyProblemId: spId }); // Refresh
    await subRepo.save([
      { studyId, studyProblemId: spId, userId: 1, username: '알고마스터', language: 'Python', status: 'success', memory: 128, time: 40, code: '...', submittedAt: today.toISOString() },
      { studyId, studyProblemId: spId, userId: 2, username: 'CodeNinja', language: 'JavaScript', status: 'success', memory: 256, time: 60, code: '...', submittedAt: today.toISOString() },
      { studyId, studyProblemId: spId, userId: 4, username: '백준킹', language: 'Java', status: 'success', memory: 512, time: 100, code: '...', submittedAt: today.toISOString() },
    ]);
    console.log('Added 3 mock submissions for Problem 1002');
  }

  await ds.destroy();
}

add1002().catch(console.error);
