import type { Participant } from '@/domains/study/hooks/useRoomStore';
import type { StudyMember, StudyRoomDetail } from '@/domains/study/types';

export type ParticipantPatch = Pick<Participant, 'id'> & Partial<Omit<Participant, 'id'>>;

interface ParticipantSnapshotOptions {
  replaceMissing?: boolean;
}

type StudyRoomParticipantSource = Pick<StudyRoomDetail, 'members'> & {
  owner?: { id: number };
};

function materializeParticipant(patch: ParticipantPatch, existing?: Participant): Participant {
  return {
    id: patch.id,
    nickname: patch.nickname ?? existing?.nickname ?? `User ${patch.id}`,
    profileImage: patch.profileImage ?? existing?.profileImage,
    isOwner: patch.isOwner ?? existing?.isOwner ?? false,
    isMuted: patch.isMuted ?? existing?.isMuted ?? false,
    isVideoOff: patch.isVideoOff ?? existing?.isVideoOff ?? false,
    isOnline: patch.isOnline ?? existing?.isOnline ?? false,
    lastSpeakingAt: patch.lastSpeakingAt ?? existing?.lastSpeakingAt,
  };
}

export function createParticipantPlaceholder(
  id: number,
  patch: Omit<ParticipantPatch, 'id'> = {},
): Participant {
  return materializeParticipant({ id, ...patch });
}

export function mapStudyMemberToParticipantPatch(
  member: StudyMember,
  ownerId?: number | null,
): ParticipantPatch | null {
  const id = Number(member.userId);

  if (!Number.isFinite(id)) {
    return null;
  }

  const isOnline =
    typeof member.online === 'boolean'
      ? member.online
      : typeof member.isOnline === 'boolean'
        ? member.isOnline
        : undefined;

  return {
    id,
    nickname: member.nickname,
    profileImage: member.profileImg,
    isOwner: member.role === 'OWNER' || (ownerId != null && id === ownerId),
    isOnline,
  };
}

export function mapStudyMembersToParticipantPatches(
  members: StudyMember[] = [],
  ownerId?: number | null,
): ParticipantPatch[] {
  return members
    .map((member) => mapStudyMemberToParticipantPatch(member, ownerId))
    .filter((participant): participant is ParticipantPatch => participant !== null);
}

export function mapStudyRoomToParticipantPatches(
  room: StudyRoomParticipantSource,
): ParticipantPatch[] {
  return mapStudyMembersToParticipantPatches(room.members, room.owner?.id);
}

export function materializeParticipants(participants: ParticipantPatch[]): Participant[] {
  return participants.map((participant) => materializeParticipant(participant));
}

export function applyParticipantPatches(
  currentParticipants: Participant[],
  patches: ParticipantPatch[],
): Participant[] {
  if (patches.length === 0) {
    return currentParticipants;
  }

  const nextParticipants = [...currentParticipants];
  const indexById = new Map<number, number>(
    currentParticipants.map((participant, index) => [participant.id, index]),
  );

  patches.forEach((patch) => {
    const existingIndex = indexById.get(patch.id);

    if (existingIndex == null) {
      nextParticipants.push(materializeParticipant(patch));
      indexById.set(patch.id, nextParticipants.length - 1);
      return;
    }

    nextParticipants[existingIndex] = materializeParticipant(
      patch,
      nextParticipants[existingIndex],
    );
  });

  return nextParticipants;
}

export function mergeParticipantsFromSnapshot(
  currentParticipants: Participant[],
  snapshotParticipants: ParticipantPatch[],
  options: ParticipantSnapshotOptions = {},
): Participant[] {
  const { replaceMissing = true } = options;
  const currentById = new Map<number, Participant>(
    currentParticipants.map((participant) => [participant.id, participant]),
  );
  const snapshotIds = new Set<number>();

  const mergedParticipants = snapshotParticipants.map((participant) => {
    snapshotIds.add(participant.id);
    return materializeParticipant(participant, currentById.get(participant.id));
  });

  if (replaceMissing) {
    return mergedParticipants;
  }

  currentParticipants.forEach((participant) => {
    if (!snapshotIds.has(participant.id)) {
      mergedParticipants.push(participant);
    }
  });

  return mergedParticipants;
}

export function syncParticipantsOnlineState(
  currentParticipants: Participant[],
  onlineIds: number[],
): Participant[] {
  const onlineSet = new Set<number>(onlineIds);
  const knownIds = new Set<number>();

  const syncedParticipants = currentParticipants.map((participant) => {
    knownIds.add(participant.id);
    return {
      ...participant,
      isOnline: onlineSet.has(participant.id),
    };
  });

  onlineIds.forEach((id) => {
    if (!knownIds.has(id)) {
      syncedParticipants.push(createParticipantPlaceholder(id, { isOnline: true }));
    }
  });

  return syncedParticipants;
}
