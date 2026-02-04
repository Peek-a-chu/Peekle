import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date): string {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}월 ${day}일`;
}

export function getBojTierName(level: number): string {
  if (level === 0) return 'Unrated';
  const tiers = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Ruby'];
  const tierIndex = Math.floor((level - 1) / 5);
  const tierRank = 5 - ((level - 1) % 5);

  if (tierIndex < 0) return 'Unrated';
  if (tierIndex >= tiers.length) return 'Ruby';
  return `${tiers[tierIndex]} ${tierRank}`;
}

export function getBojTierColorClass(level: number): string {
  if (level === 0) return 'text-muted-foreground';
  if (level <= 5) return 'text-[#ad5600]'; // Bronze
  if (level <= 10) return 'text-[#435f7a]'; // Silver
  if (level <= 15) return 'text-[#ec9a00]'; // Gold
  if (level <= 20) return 'text-[#27e2a4]'; // Platinum
  if (level <= 25) return 'text-[#00b4fc]'; // Diamond
  return 'text-[#ff0062]'; // Ruby
}

export function hexToHsl(hex: string): string {
  let r = 0,
    g = 0,
    b = 0;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.substring(1, 3), 16);
    g = parseInt(hex.substring(3, 5), 16);
    b = parseInt(hex.substring(5, 7), 16);
  }

  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h = 0,
    s;
  const l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/**
 * 사용자 닉네임 기반으로 기본 아바타 (DiceBear Bottts Neutral) URL을 생성합니다.
 */
export function getDefaultProfileImgUrl(nickname?: string): string {
  const seed = nickname || 'peekle';
  return `https://api.dicebear.com/9.x/bottts-neutral/svg?seed=${encodeURIComponent(seed)}`;
}
