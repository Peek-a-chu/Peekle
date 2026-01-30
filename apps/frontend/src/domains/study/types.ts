export interface Problem {
  problemId: number; // Changed from id to problemId per spec
  title: string;
  tier: string; // Changed from number to string per spec (e.g. "Bronze 5")
  solvedMemberCount?: number;
}

export interface Submission {
  submissionId?: number; // Optional because success user list doesn't have it
  code?: string;
  language?: string;
  // Additional fields from spec (Success User List)
  userId?: number;
  nickname?: string;
  memory?: number;
  executionTime?: number;
}

export interface SubmissionSuccessUser {
  userId: number;
  nickname: string;
  memory: number;
  executionTime: number;
}

export interface DailyProblem {
  problemId: number;
  externalId?: string; // BOJ problem number (e.g. "1000")
  title: string;
  tier: string;
  solvedMemberCount: number;
  totalMemberCount: number;
}

export interface StudyMember {
  userId: number;
  nickname: string;
}

export interface StudyRoomDetail {
  id: number;
  title: string;
  role: 'OWNER' | 'MEMBER';
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
  id: string; // Long in DB, but JSON safe often string or number. Backend returns Long. Let's assume number.
  studyId: number;
  senderId: number;
  senderName: string;
  content: string;
  type: 'TALK' | 'ENTER' | 'LEAVE' | 'SYSTEM' | 'CODE' | 'SUBMISSION';
  parentId?: number;
  metadata?: any;
  createdAt: string;
}

export interface SubmissionResult {
  success: boolean;
  submissionId: number;
  earnedPoints: number;
}
