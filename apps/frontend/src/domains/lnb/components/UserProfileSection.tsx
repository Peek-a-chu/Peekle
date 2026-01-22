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
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center overflow-hidden border border-white shrink-0 ml-2 shadow-sm">
                    {/* Avatar: Use image if available, else show first letter */}
                    {user.profileImage ? (
                        <img src={user.profileImage} alt={user.nickname} className="w-full h-full object-cover rounded-full" />
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

            <MyLeagueCard />
        </div>
    );
};

export default UserProfileSection;
