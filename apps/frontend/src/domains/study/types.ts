export interface Problem {
  problemId: number;     // Changed from id to problemId per spec
  title: string;
  tier: string;         // Changed from number to string per spec (e.g. "Bronze 5")
  solvedMemberCount?: number;
}

export interface Submission {
  submissionId: number; // Changed from id to submissionId per spec
  code: string;
  language: string;
  // Additional fields from spec (Success User List)
  userId?: number;
  nickname?: string;
  memory?: number;
  executionTime?: number;
}

export interface DailyProblem {
  problemId: number;
  title: string;
  tier: string;
  solvedMemberCount: number;
}

export interface StudyMember {
  userId: number;
  nickname: string;
}

export interface StudyRoomDetail {
  id: number;
  title: string;
  members: StudyMember[];
}

export interface StudyListContent {
  id: number;
  title: string;
  memberCount: number;
}

export interface StudyListResponse {
  content: StudyListContent[];
  totalPages: number;
}

export interface ChatMessageResponse {
  senderName: string;
  content: string;
  type: 'TALK' | 'ENTER' | 'LEAVE'; // Add other types if needed
}

export interface SubmissionResult {
  success: boolean;
  submissionId: number;
  earnedPoints: number;
}
