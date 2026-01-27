import { DataSource } from 'typeorm';
import { AvailableProblem } from './src/entities/available-problem.entity';
import { StudyProblem } from './src/entities/study-problem.entity';
import { StudyProblemParticipant } from './src/entities/study-problem-participant.entity';
import { Submission } from './src/entities/submission.entity';

const AppDataSource = new DataSource({
  type: 'sqlite',
  database: 'peekle.sqlite',
  entities: [AvailableProblem, StudyProblem, StudyProblemParticipant, Submission],
  synchronize: true,
});

async function seed() {
  await AppDataSource.initialize();
  console.log('Data Source has been initialized!');

  const availableProblemRepo = AppDataSource.getRepository(AvailableProblem);
  const studyProblemRepo = AppDataSource.getRepository(StudyProblem);

  const problems = [
    { number: 1000, title: 'A+B', source: 'Baekjoon', tags: ['bronze5', 'math'], tier: 1 },
    { number: 1001, title: 'A-B', source: 'Baekjoon', tags: ['bronze5', 'math'], tier: 1 },
    { number: 1002, title: '터렛', source: 'Baekjoon', tags: ['silver3', 'geometry'], tier: 8 },
    { number: 1003, title: '피보나치 함수', source: 'Baekjoon', tags: ['silver3', 'dp'], tier: 8 },
    { number: 1920, title: '수 찾기', source: 'Baekjoon', tags: ['silver4', 'binary_search'], tier: 7 },
    { number: 2557, title: 'Hello World', source: 'Baekjoon', tags: ['bronze5'], tier: 1 },
    { number: 2739, title: '구구단', source: 'Baekjoon', tags: ['bronze5'], tier: 1 },
    { number: 1008, title: 'A/B', source: 'Baekjoon', tags: ['bronze5'], tier: 1 },
    { number: 1330, title: '두 수 비교하기', source: 'Baekjoon', tags: ['bronze5'], tier: 1 },
    { number: 9498, title: '시험 성적', source: 'Baekjoon', tags: ['bronze5'], tier: 1 },
  ];

  for (const p of problems) {
    const existing = await availableProblemRepo.findOneBy({ number: p.number });
    if (!existing) {
      await availableProblemRepo.save(p);
      console.log(`Added problem ${p.number}`);
    } else {
      console.log(`Problem ${p.number} already exists`);
    }
  }

  const submissionRepo = AppDataSource.getRepository(Submission);

  const seedStudy = async (studyId: number, problemNumbers: number[], date?: Date) => {
    const targetDate = date || new Date();
    const dateStr = targetDate.toISOString().split('T')[0];

    const currentStudyProblems = await studyProblemRepo.find({
      where: { studyId },
      relations: ['problem'],
    });
    
    // Filter problems already assigned for this specific date
    const currentNumbersOnDate = currentStudyProblems
      .filter(p => {
        const pDate = p.createdAt instanceof Date ? p.createdAt : new Date(p.createdAt);
        return pDate.toISOString().split('T')[0] === dateStr;
      })
      .map(p => p.problem.number);

    console.log(`Study ${studyId} on ${dateStr} currently has: ${currentNumbersOnDate.join(', ')}`);

    for (const num of problemNumbers) {
      if (!currentNumbersOnDate.includes(num)) {
        const p = await availableProblemRepo.findOneBy({ number: num });
        if (p) {
          // Manually setting createdAt to simulate different dates
          const saved = await studyProblemRepo.save({ 
            studyId, 
            problem: p, 
            createdAt: targetDate 
          });
          console.log(`Added problem ${num} to study ${studyId} for date ${dateStr}`);

          // Add mock submissions for varied counts
          if (studyId === 1) {
            if (num === 1000) {
              // 2 people solved 1000
              await submissionRepo.save([
                { studyId, studyProblemId: saved.id, userId: 1, username: '알고마스터', language: 'Python', status: 'success', code: 'print(A+B)', submittedAt: new Date().toISOString() },
                { studyId, studyProblemId: saved.id, userId: 2, username: 'CodeNinja', language: 'JavaScript', status: 'success', code: 'console.log(A+B)', submittedAt: new Date().toISOString() },
              ]);
            } else if (num === 1001) {
              // 1 person solved 1001
              await submissionRepo.save({
                studyId, studyProblemId: saved.id, userId: 3, username: 'PS러버', language: 'C++', status: 'success', code: 'cout << A-B;', submittedAt: new Date().toISOString()
              });
            } else if (num === 1002) {
                // 3 people solved 1002
                await submissionRepo.save([
                  { studyId, studyProblemId: saved.id, userId: 1, username: '알고마스터', language: 'Python', status: 'success', code: '...', submittedAt: new Date().toISOString() },
                  { studyId, studyProblemId: saved.id, userId: 2, username: 'CodeNinja', language: 'JavaScript', status: 'success', code: '...', submittedAt: new Date().toISOString() },
                  { studyId, studyProblemId: saved.id, userId: 4, username: '백준킹', language: 'Java', status: 'success', code: '...', submittedAt: new Date().toISOString() },
                ]);
            }
          }
        }
      }
    }
  };

  // Today's problems
  const today = new Date();
  await seedStudy(1, [1000, 1001], today);
  await seedStudy(2, [1003], today);

  // Yesterday's problems (Test date filtering)
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  await seedStudy(1, [2557, 2739], yesterday);
  await seedStudy(2, [1920, 1008], yesterday);

  // Future problems
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  await seedStudy(1, [1330], tomorrow);

  await AppDataSource.destroy();
}

seed().catch((err) => {
  console.error('Error during seeding:', err);
  process.exit(1);
});
