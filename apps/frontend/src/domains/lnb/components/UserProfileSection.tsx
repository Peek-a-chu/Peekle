'use client';

import Image from 'next/image';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronDown, User, LogOut } from 'lucide-react';
import MyLeagueCard from './MyLeagueCard';
import { logout } from '@/app/api/authApi';

const UserProfileSection = () => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Mock user data
  const user = {
    nickname: 'CodeMaster',
    profileImage: '', // Empty for placeholder
  };

  // 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

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

  return (
    <div className="px-5 py-1">
      <Link href="/profile/me" className="flex items-center gap-3 mb-6 group">
        <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center overflow-hidden border border-white shrink-0 ml-2 shadow-sm">
          {/* Avatar: Use image if available, else show first letter */}
          {user.profileImage ? (
            <Image
              src={user.profileImage}
              alt={user.nickname}
              fill
              className="object-cover rounded-full"
            />
          ) : (
            <span className="text-white font-bold text-lg">
              {user.nickname.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <span className="flex-1 font-semibold text-sm text-slate-800 truncate group-hover:text-slate-900">
          {user.nickname}
        </span>
        <ChevronDown className="w-5 h-5 text-gray-400 shrink-0 mr-4" />
      </Link>
      <div className="relative mb-6" ref={dropdownRef}>
        <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary via-primary/80 to-accent flex items-center justify-center overflow-hidden border-2 border-background shrink-0 ml-2 shadow-sm">
            {user.profileImage ? (
              <img
                src={user.profileImage}
                alt={user.nickname}
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              <span className="text-primary-foreground font-bold text-lg">
                {user.nickname.charAt(0).toUpperCase()}
              </span>
            )}
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
              href="/profile/me"
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

      <MyLeagueCard />
    </div>
  );
};

export default UserProfileSection;
