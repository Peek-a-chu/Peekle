import { LeagueType } from '@/components/LeagueIcon';

export interface GameParticipant {
  userId: number;
  nickname: string;
  score: number;
  rank: number;
  profileImg?: string;
  isMe?: boolean;
  clearTime?: number; // Speed Race: 걸린 시간
  solvedCount?: number; // Time Attack: 푼 문제 수
  teamId?: string; // 팀전일 경우 팀 ID ('RED' | 'BLUE' 등)
}

export interface LeagueInfo {
  league: LeagueType;
  currentExp: number;
  gainedExp: number;
}

export interface PersonalStats {
  pointsGained: number;
  correctAnswers: number;
  totalQuestions: number;
  accuracy: number;
}

export interface GameResultData {
  participants: GameParticipant[];
  personalStats: PersonalStats;
  leagueInfo: LeagueInfo;
  mode: 'SPEED_RACE' | 'TIME_ATTACK';
  teamType: 'INDIVIDUAL' | 'TEAM';
  playTime: number; // in seconds
}

export interface GameRoomResponse {
  roomId: number;
  title: string;
  secret: boolean;
  isSecret?: boolean;
  status: 'WAITING' | 'PLAYING' | 'END';
  maxPlayers: number;
  timeLimit: number;
  problemCount: number;
  teamType: 'INDIVIDUAL' | 'TEAM';
  mode: 'TIME_ATTACK' | 'SPEED_RACE';
  host: {
    id: number;
    nickname: string;
    profileImg: string;
  };
  tags: string[];
  currentPlayers?: number;
}

