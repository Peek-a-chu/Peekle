import Image from 'next/image';
import { cn } from '@/lib/utils';

interface UserIconProps {
  src?: string | null;
  nickname?: string;
  user?: {
    nickname: string;
    profileImg?: string | null;
    profileImage?: string | null;
    [key: string]: any;
  };
  size?: number;
  className?: string;
  unoptimized?: boolean;
}

export function UserIcon({
  src,
  nickname,
  user,
  size = 40,
  className,
  unoptimized = false,
}: UserIconProps) {
  // user 객체가 있으면 거기서 정보를 가져옴
  const finalNickname = nickname || user?.nickname;
  const userImage = user?.profileImg || user?.profileImage; // Handle both likely property names if types vary
  const rawSrc = src ?? userImage;
  const normalizedSrc = typeof rawSrc === 'string' ? rawSrc.trim() : '';
  const hasValidSrc =
    normalizedSrc.length > 0 && normalizedSrc !== 'null' && normalizedSrc !== 'undefined';
  const fallbackLabel = finalNickname?.charAt(0)?.toUpperCase() || '?';

  return (
    <div
      className={cn(
        'relative rounded-full overflow-hidden bg-muted flex items-center justify-center border border-border shrink-0',
        className,
      )}
      style={{ width: size, height: size }}
    >
      {hasValidSrc ? (
        <Image
          src={normalizedSrc}
          alt={finalNickname || 'User profile image'}
          width={size}
          height={size}
          className="w-full h-full object-cover"
          unoptimized={unoptimized}
        />
      ) : (
        <span className="text-xs font-semibold text-muted-foreground">{fallbackLabel}</span>
      )}
    </div>
  );
}
