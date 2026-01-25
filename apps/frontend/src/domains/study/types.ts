export interface Problem {
  id: number;
  number: number;
  title: string;
  source: string;
  status: 'not_started' | 'in_progress' | 'completed';
  tags?: string[];
  participantCount?: number;
  totalParticipants?: number;
  url?: string;
  tier?: number; // Added for hint
}

export interface Submission {
  id: number;
  userId: number;
  username: string;
  language: string;
  memory: number; // KB
  time: number; // ms
  status: 'success' | 'fail';
  submittedAt: string;
  code?: string;
}
