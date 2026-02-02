import Image from 'next/image';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronDown, User, LogOut } from 'lucide-react';
import MyLeagueCard from './MyLeagueCard';
import { logout } from '@/api/authApi';
import { useAuthStore } from '@/store/auth-store';

import { UserProfile } from '@/domains/profile/types';
import { getDefaultAvatarUrl } from '@/lib/utils';
// import defaultProfileImg from '@/assets/icons/profile.png';

interface UserProfileSectionProps {
  initialUser: UserProfile;
}

const UserProfileSection = ({ initialUser }: UserProfileSectionProps) => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const storeUser = useAuthStore((state) => state.user);
  const checkAuth = useAuthStore((state) => state.checkAuth);

  // Use store user if available (client-side update), otherwise fallback to initialUser (SSR)
  const user = storeUser || initialUser;

  // Default avatar
  const defaultAvatar = getDefaultAvatarUrl(user.nickname);

  // 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    // 컴포넌트 마운트 시 최신 유저 정보 조회 (프로필 이미지 등 동기화)
    checkAuth();

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/');
    } catch {
      // 에러가 나도 로그아웃 처리
      router.push('/');
    }
  };

  if (!user) return null;

  return (
    <div className="px-5 py-1">
      <div className="relative mb-6" ref={dropdownRef}>
        <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center gap-3 group">
          <div className="relative w-11 h-11 shrink-0 rounded-full bg-muted overflow-hidden border border-border">
            <Image
              src={user.profileImgThumb || user.profileImg || defaultAvatar}
              alt={user.nickname}
              fill
              className="object-cover"
              unoptimized={!user.profileImg && !user.profileImgThumb}
            />
          </div>
          <span className="flex-1 font-semibold text-sm text-foreground truncate group-hover:text-primary text-left transition-colors">
            {user.nickname}
          </span>
          <ChevronDown
            className={`w-5 h-5 text-muted-foreground shrink-0 mr-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {/* 드롭다운 메뉴 */}

        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 mx-2 bg-card rounded-xl shadow-lg border border-border py-2 z-50 animate-in fade-in zoom-in-95 duration-200">
            <Link
              href={`/profile/${user.nickname}`}
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
            >
              <User className="w-4 h-4" />
              내정보
            </Link>
            <button
              onClick={() => void handleLogout()}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              로그아웃
            </button>
          </div>
        )}
      </div>

      <MyLeagueCard
        initialTier={user.league}
        initialScore={user.leaguePoint}
      />
    </div>
  );
};

export default UserProfileSection;
