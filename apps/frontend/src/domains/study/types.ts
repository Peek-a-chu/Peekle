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
  id: number; // PK of StudyProblem
  problemId: number; // PK of Problem
  externalId?: string; // BOJ problem number (e.g. "1000")
  title: string;
  tier: string;
  solvedMemberCount: number;
  totalMemberCount: number;
  number?: number;
  tags?: string[];
  status?: 'success' | 'fail' | 'not_started';
  url?: string;
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
  description: string;
  isActive: boolean;
  createdAt: string;
  memberCount: number;
  profileImages: string[];
  rankingPoint: number; // 스터디 그룹 랭킹 포인트
  owner?: {
    id: number;
    nickname: string;
    profileImage?: string;
  };
  rank?: number; // 랭킹 순위 (프론트엔드에서 계산, 옵셔널)
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
