'use client';

import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import MyLeagueCard from './MyLeagueCard';

const UserProfileSection = () => {
  // Mock user data
  const user = {
    nickname: 'CodeMaster',
    profileImage: '', // Empty for placeholder
  };

  return (
    <div className="px-5 py-1">
      <Link href="/profile/me" className="flex items-center gap-3 mb-6 group">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary via-primary/80 to-accent flex items-center justify-center overflow-hidden border-2 border-background shrink-0 ml-2 shadow-sm">
          {/* Avatar: Use image if available, else show first letter */}
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
        <span className="flex-1 font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
          {user.nickname}
        </span>
        <ChevronDown className="w-5 h-5 text-muted-foreground shrink-0 mr-4" />
      </Link>

      <MyLeagueCard />
    </div>
  );
};

export default UserProfileSection;
