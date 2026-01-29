import Image from 'next/image';
import { UserProfile } from '../types';

interface Props {
  user: UserProfile;
  isMe: boolean;
}

export function CCProfileHeader({ user, isMe }: Props) {
  const isExtensionLinked = !!user.bojId;

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-6">
        {/* Avatar (Placeholder based on nickname) */}
        <div className="relative w-24 h-24 md:w-28 md:h-28 rounded-full bg-primary/10 flex items-center justify-center text-4xl font-bold text-primary shrink-0 border-4 border-background shadow-lg overflow-hidden">
          {user.profileImg ? (
            <Image src={user.profileImg} alt={user.nickname} fill className="object-cover" />
          ) : (
            user.nickname.charAt(0).toUpperCase()
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold text-foreground tracking-tight">{user.nickname}</h1>

          {/* BOJ Integration Status */}
          <div className="flex items-center">
            {isExtensionLinked ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                BOJ: {user.bojId}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border">
                <span className="w-2 h-2 rounded-full bg-muted-foreground/50"></span>
                BOJ 미연동
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {!isExtensionLinked && isMe && (
          <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition shadow-sm">
            확장프로그램 연동하기
          </button>
        )}
        {isMe && (
          <button className="px-4 py-2 border border-border rounded-lg text-sm font-semibold text-foreground hover:bg-muted/50 transition shadow-sm">
            프로필 수정
          </button>
        )}
      </div>
    </div>
  );
}
