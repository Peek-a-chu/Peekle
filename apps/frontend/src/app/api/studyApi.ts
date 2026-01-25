export interface Participant {
  id: number;
  odUid: string;
  nickname: string;
  isOwner: boolean;
  isMuted: boolean;
  isVideoOff: boolean;
  isOnline: boolean;
  lastSpeakingAt?: number;
}

export interface RoomInfo {
  roomId: number;
  roomTitle: string;
  roomDescription: string;
  inviteCode: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function fetchStudyParticipants(studyId: number): Promise<Participant[]> {
  const res = await fetch(`${API_BASE_URL}/api/study/${studyId}/participants`);
  if (!res.ok) {
    throw new Error('Failed to fetch participants');
  }
  return res.json() as Promise<Participant[]>;
}

export async function fetchStudyRoom(studyId: number): Promise<RoomInfo> {
  const res = await fetch(`${API_BASE_URL}/api/study/${studyId}`);
  if (!res.ok) {
    throw new Error('Failed to fetch study room info');
  }
  return res.json() as Promise<RoomInfo>;
}
