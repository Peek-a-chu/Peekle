import Image from 'next/image';
import { getDefaultProfileImgUrl } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface UserIconProps {
    src?: string | null;
    nickname?: string;
    size?: number;
    className?: string;
    unoptimized?: boolean;
}

export function UserIcon({
    src,
    nickname,
    size = 40,
    className,
    unoptimized = false,
}: UserIconProps) {
    const [error, setError] = useState(false);
    const fallbackUrl = getDefaultProfileImgUrl(nickname);

    // If we have a source and no error yet, try to show the image
    const finalSrc = !error && src && src !== '' ? src : fallbackUrl;

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
                alt={nickname || 'User profile image'}
                width={size}
                height={size}
                className="w-full h-full object-cover"
                onError={() => setError(true)}
                unoptimized={unoptimized || finalSrc.includes('dicebear.com')}
            />
        </div>
    );
}
