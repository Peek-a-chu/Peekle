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

// Sample code snippets for submissions
const sampleCodes = {
  python: {
    'A+B': `a, b = map(int, input().split())
print(a + b)`,
    'A-B': `a, b = map(int, input().split())
print(a - b)`,
    'turret': `import math

T = int(input())
for _ in range(T):
    x1, y1, r1, x2, y2, r2 = map(int, input().split())
    d = math.sqrt((x2-x1)**2 + (y2-y1)**2)

    if d == 0 and r1 == r2:
        print(-1)
    elif d > r1 + r2 or d < abs(r1 - r2):
        print(0)
    elif d == r1 + r2 or d == abs(r1 - r2):
        print(1)
    else:
        print(2)`,
    'fibonacci': `import sys
sys.setrecursionlimit(100000)

memo = {}

def fib(n):
    if n in memo:
        return memo[n]
    if n == 0:
        return (1, 0)
    if n == 1:
        return (0, 1)

    a = fib(n-1)
    b = fib(n-2)
    memo[n] = (a[0] + b[0], a[1] + b[1])
    return memo[n]

T = int(input())
for _ in range(T):
    n = int(input())
    result = fib(n)
    print(result[0], result[1])`,
    'binarySearch': `import sys
input = sys.stdin.readline

n = int(input())
arr = set(map(int, input().split()))
m = int(input())
targets = list(map(int, input().split()))

for t in targets:
    print(1 if t in arr else 0)`,
  },
  javascript: {
    'A+B': `const fs = require('fs');
const input = fs.readFileSync('/dev/stdin').toString().trim().split(' ');
const [a, b] = input.map(Number);
console.log(a + b);`,
    'A-B': `const fs = require('fs');
const input = fs.readFileSync('/dev/stdin').toString().trim().split(' ');
const [a, b] = input.map(Number);
console.log(a - b);`,
    'turret': `const fs = require('fs');
const input = fs.readFileSync('/dev/stdin').toString().trim().split('\\n');
const T = parseInt(input[0]);

for (let i = 1; i <= T; i++) {
  const [x1, y1, r1, x2, y2, r2] = input[i].split(' ').map(Number);
  const d = Math.sqrt(Math.pow(x2-x1, 2) + Math.pow(y2-y1, 2));

  if (d === 0 && r1 === r2) {
    console.log(-1);
  } else if (d > r1 + r2 || d < Math.abs(r1 - r2)) {
    console.log(0);
  } else if (d === r1 + r2 || d === Math.abs(r1 - r2)) {
    console.log(1);
  } else {
    console.log(2);
  }
}`,
  },
  cpp: {
    'A+B': `#include <iostream>
using namespace std;

int main() {
    int a, b;
    cin >> a >> b;
    cout << a + b << endl;
    return 0;
}`,
    'A-B': `#include <iostream>
using namespace std;

int main() {
    int a, b;
    cin >> a >> b;
    cout << a - b << endl;
    return 0;
}`,
    'fibonacci': `#include <iostream>
using namespace std;

int dp[41][2];

int main() {
    dp[0][0] = 1; dp[0][1] = 0;
    dp[1][0] = 0; dp[1][1] = 1;

    for (int i = 2; i <= 40; i++) {
        dp[i][0] = dp[i-1][0] + dp[i-2][0];
        dp[i][1] = dp[i-1][1] + dp[i-2][1];
    }

    int T; cin >> T;
    while (T--) {
        int n; cin >> n;
        cout << dp[n][0] << " " << dp[n][1] << endl;
    }
    return 0;
}`,
  },
  java: {
    'A+B': `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int a = sc.nextInt();
        int b = sc.nextInt();
        System.out.println(a + b);
    }
}`,
    'binarySearch': `import java.util.*;
import java.io.*;

public class Main {
    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        int n = Integer.parseInt(br.readLine());
        Set<Integer> set = new HashSet<>();
        StringTokenizer st = new StringTokenizer(br.readLine());
        for (int i = 0; i < n; i++) {
            set.add(Integer.parseInt(st.nextToken()));
        }

        int m = Integer.parseInt(br.readLine());
        st = new StringTokenizer(br.readLine());
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < m; i++) {
            sb.append(set.contains(Integer.parseInt(st.nextToken())) ? 1 : 0).append("\\n");
        }
        System.out.print(sb);
    }
}`,
  },
};

async function seed() {
  await AppDataSource.initialize();
  console.log('Data Source has been initialized!');

  const availableProblemRepo = AppDataSource.getRepository(AvailableProblem);
  const studyProblemRepo = AppDataSource.getRepository(StudyProblem);
  const submissionRepo = AppDataSource.getRepository(Submission);
  const participantRepo = AppDataSource.getRepository(StudyProblemParticipant);

  // Clear existing data for clean seed
  console.log('Clearing existing data...');
  await submissionRepo.clear();
  await participantRepo.clear();
  await studyProblemRepo.clear();
  await availableProblemRepo.clear();

  // Seed Available Problems
  const problems = [
    { number: 1000, title: 'A+B', source: 'Baekjoon', tags: ['bronze5', 'math', 'implementation'], tier: 1 },
    { number: 1001, title: 'A-B', source: 'Baekjoon', tags: ['bronze5', 'math', 'implementation'], tier: 1 },
    { number: 1002, title: '터렛', source: 'Baekjoon', tags: ['silver3', 'geometry', 'math'], tier: 8 },
    { number: 1003, title: '피보나치 함수', source: 'Baekjoon', tags: ['silver3', 'dp', 'recursion'], tier: 8 },
    { number: 1920, title: '수 찾기', source: 'Baekjoon', tags: ['silver4', 'binary_search', 'set'], tier: 7 },
    { number: 2557, title: 'Hello World', source: 'Baekjoon', tags: ['bronze5', 'implementation'], tier: 1 },
    { number: 2739, title: '구구단', source: 'Baekjoon', tags: ['bronze5', 'implementation'], tier: 1 },
    { number: 1008, title: 'A/B', source: 'Baekjoon', tags: ['bronze5', 'math'], tier: 1 },
    { number: 1330, title: '두 수 비교하기', source: 'Baekjoon', tags: ['bronze5', 'implementation'], tier: 1 },
    { number: 9498, title: '시험 성적', source: 'Baekjoon', tags: ['bronze5', 'implementation'], tier: 1 },
    { number: 1260, title: 'DFS와 BFS', source: 'Baekjoon', tags: ['silver2', 'graph', 'bfs', 'dfs'], tier: 9 },
    { number: 2606, title: '바이러스', source: 'Baekjoon', tags: ['silver3', 'graph', 'bfs', 'dfs'], tier: 8 },
  ];

  console.log('Seeding available problems...');
  for (const p of problems) {
    await availableProblemRepo.save(p);
    console.log(`  Added problem ${p.number}: ${p.title}`);
  }

  // Participants mock data
  const participants = [
    { userId: 1, username: '알고마스터' },
    { userId: 2, username: 'CodeNinja' },
    { userId: 3, username: 'PS러버' },
    { userId: 4, username: '백준킹' },
  ];

  // Helper function to create submissions
  const createSubmission = async (
    studyId: number,
    studyProblemId: number,
    user: { userId: number; username: string },
    language: string,
    codeKey: string,
    status: string,
    hoursAgo: number,
  ) => {
    const codeMap = sampleCodes[language.toLowerCase()] || sampleCodes.python;
    const code = codeMap[codeKey] || `// Solution for ${codeKey}`;

    const submittedAt = new Date(Date.now() - hoursAgo * 3600000);

    await submissionRepo.save({
      studyId,
      studyProblemId,
      userId: user.userId,
      username: user.username,
      language,
      memory: Math.floor(Math.random() * 50000) + 10000,
      time: Math.floor(Math.random() * 500) + 50,
      status,
      code,
      submittedAt: submittedAt.toISOString(),
    });
  };

  // Seed Study 1 - Today's problems
  const today = new Date();
  console.log('\nSeeding Study 1 - Today...');

  // Problem 1000 (A+B) - 3 solvers
  const p1000 = await availableProblemRepo.findOneBy({ number: 1000 });
  if (p1000) {
    const sp1000 = await studyProblemRepo.save({ studyId: 1, problem: p1000, createdAt: today });
    console.log('  Added problem 1000 (A+B)');

    await createSubmission(1, sp1000.id, participants[0], 'Python', 'A+B', 'success', 2);
    await createSubmission(1, sp1000.id, participants[1], 'JavaScript', 'A+B', 'success', 1.5);
    await createSubmission(1, sp1000.id, participants[2], 'cpp', 'A+B', 'success', 1);
    console.log('    - 3 submissions added');
  }

  // Problem 1001 (A-B) - 2 solvers
  const p1001 = await availableProblemRepo.findOneBy({ number: 1001 });
  if (p1001) {
    const sp1001 = await studyProblemRepo.save({ studyId: 1, problem: p1001, createdAt: today });
    console.log('  Added problem 1001 (A-B)');

    await createSubmission(1, sp1001.id, participants[0], 'Python', 'A-B', 'success', 1.8);
    await createSubmission(1, sp1001.id, participants[3], 'Java', 'A+B', 'success', 0.5);
    console.log('    - 2 submissions added');
  }

  // Problem 1002 (터렛) - 4 solvers (everyone)
  const p1002 = await availableProblemRepo.findOneBy({ number: 1002 });
  if (p1002) {
    const sp1002 = await studyProblemRepo.save({ studyId: 1, problem: p1002, createdAt: today });
    console.log('  Added problem 1002 (터렛)');

    await createSubmission(1, sp1002.id, participants[0], 'Python', 'turret', 'success', 3);
    await createSubmission(1, sp1002.id, participants[1], 'JavaScript', 'turret', 'success', 2.5);
    await createSubmission(1, sp1002.id, participants[2], 'Python', 'turret', 'success', 2);
    await createSubmission(1, sp1002.id, participants[3], 'Java', 'A+B', 'success', 1.5);
    console.log('    - 4 submissions added');
  }

  // Seed Study 1 - Yesterday's problems
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  console.log('\nSeeding Study 1 - Yesterday...');

  // Problem 1003 (피보나치 함수) - 2 solvers
  const p1003 = await availableProblemRepo.findOneBy({ number: 1003 });
  if (p1003) {
    const sp1003 = await studyProblemRepo.save({ studyId: 1, problem: p1003, createdAt: yesterday });
    console.log('  Added problem 1003 (피보나치 함수)');

    await createSubmission(1, sp1003.id, participants[0], 'Python', 'fibonacci', 'success', 26);
    await createSubmission(1, sp1003.id, participants[2], 'cpp', 'fibonacci', 'success', 25);
    console.log('    - 2 submissions added');
  }

  // Problem 1920 (수 찾기) - 3 solvers
  const p1920 = await availableProblemRepo.findOneBy({ number: 1920 });
  if (p1920) {
    const sp1920 = await studyProblemRepo.save({ studyId: 1, problem: p1920, createdAt: yesterday });
    console.log('  Added problem 1920 (수 찾기)');

    await createSubmission(1, sp1920.id, participants[0], 'Python', 'binarySearch', 'success', 28);
    await createSubmission(1, sp1920.id, participants[1], 'JavaScript', 'A+B', 'success', 27);
    await createSubmission(1, sp1920.id, participants[3], 'Java', 'binarySearch', 'success', 26);
    console.log('    - 3 submissions added');
  }

  // Seed Study 1 - Two days ago
  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  console.log('\nSeeding Study 1 - Two days ago...');

  const p2557 = await availableProblemRepo.findOneBy({ number: 2557 });
  if (p2557) {
    const sp2557 = await studyProblemRepo.save({ studyId: 1, problem: p2557, createdAt: twoDaysAgo });
    console.log('  Added problem 2557 (Hello World)');

    await createSubmission(1, sp2557.id, participants[0], 'Python', 'A+B', 'success', 50);
    await createSubmission(1, sp2557.id, participants[1], 'JavaScript', 'A+B', 'success', 49);
    await createSubmission(1, sp2557.id, participants[2], 'Python', 'A+B', 'success', 48);
    await createSubmission(1, sp2557.id, participants[3], 'Java', 'A+B', 'success', 47);
    console.log('    - 4 submissions added');
  }

  const p1260 = await availableProblemRepo.findOneBy({ number: 1260 });
  if (p1260) {
    const sp1260 = await studyProblemRepo.save({ studyId: 1, problem: p1260, createdAt: twoDaysAgo });
    console.log('  Added problem 1260 (DFS와 BFS)');

    await createSubmission(1, sp1260.id, participants[0], 'Python', 'A+B', 'success', 52);
    await createSubmission(1, sp1260.id, participants[2], 'Python', 'A+B', 'success', 51);
    console.log('    - 2 submissions added');
  }

  // Verify data
  console.log('\n--- Verification ---');
  const totalProblems = await availableProblemRepo.count();
  const totalStudyProblems = await studyProblemRepo.count();
  const totalSubmissions = await submissionRepo.count();

  console.log(`Total available problems: ${totalProblems}`);
  console.log(`Total study problems (Study 1): ${totalStudyProblems}`);
  console.log(`Total submissions: ${totalSubmissions}`);

  await AppDataSource.destroy();
  console.log('\nSeed completed successfully!');
}

seed().catch((err) => {
  console.error('Error during seeding:', err);
  process.exit(1);
});
