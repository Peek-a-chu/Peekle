import Image from 'next/image';
import { getDefaultProfileImgUrl } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface UserIconProps {
    src?: string | null;
    nickname?: string;
    user?: { nickname: string; profileImg?: string | null; profileImage?: string | null;[key: string]: any };
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
    const [error, setError] = useState(false);

    // user 객체가 있으면 거기서 정보를 가져옴
    const finalNickname = nickname || user?.nickname;
    const userImage = user?.profileImg || user?.profileImage; // Handle both likely property names if types vary
    const sourceUrl = src || userImage;

    const fallbackUrl = getDefaultProfileImgUrl(finalNickname);
    const finalSrc = error || !sourceUrl ? fallbackUrl : sourceUrl;

    return (
        <div
            className={cn(
                'relative rounded-full overflow-hidden bg-muted flex items-center justify-center border border-border shrink-0',
                className
            )}
            style={{ width: size, height: size }}
        >
            <Image
                src={finalSrc}
                alt={finalNickname || 'User profile image'}
                width={size}
                height={size}
                className="w-full h-full object-cover"
                onError={() => setError(true)}
                unoptimized={unoptimized || finalSrc.includes('dicebear.com')}
            />
        </div>
    );
}
