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
