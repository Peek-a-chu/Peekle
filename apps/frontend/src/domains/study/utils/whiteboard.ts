import { USER_COLORS } from '@/lib/constants';

/**
 * Deterministic (pseudo-random) color selection based on userId.
 * This ensures every client renders the same user with the same color.
 */
export function getDeterministicUserColor(userId: string, palette: string[] = USER_COLORS): string {
  if (!userId) return palette[0] ?? '#1E88E5';
  if (!palette || palette.length === 0) return '#1E88E5';

  // Simple stable hash
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % palette.length;
  return palette[index];
}

export const WHITEBOARD_TEXT_PLACEHOLDER = '텍스트 입력';

export function isBlankText(text: unknown): boolean {
  return typeof text !== 'string' || text.trim().length === 0;
}

