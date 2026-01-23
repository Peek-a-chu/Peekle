'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { ProfileHeader } from './ProfileHeader';
import { ProfileStatsRow } from './ProfileStatsRow';
import { MonthlyActivityCard } from './MonthlyActivityCard';
import { DailyActivityList } from './DailyActivityList';
import { ExtensionBanner } from './ExtensionBanner';
import { ExtensionGuide } from './ExtensionGuide';
import { useExtensionCheck } from '@/hooks/useExtensionCheck';

interface Props {
    user: UserProfile;
    isMe: boolean;
}

const TABS = {
    OVERVIEW: '개요',
    EXTENSION: '확장프로그램 관리'
} as const;

type TabKey = typeof TABS[keyof typeof TABS];

export function CCProfileView({ user, isMe }: Props) {
    const [activeTab, setActiveTab] = useState<TabKey>(TABS.OVERVIEW);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const { isInstalled, extensionToken } = useExtensionCheck();

    // 확장 프로그램 상태 체크 및 로깅
    useEffect(() => {
        if (!isMe) return;

        const checkTokenValidity = async (token: string) => {
            try {
                const res = await fetch(`/api/extension/validate`, {
                    headers: { 'X-Peekle-Token': token }
                });
                const json = await res.json();

                // ApiResponse: { success: boolean, data: { isValid: boolean }, ... }
                console.log('Token validation response:', json);

                const isValid = json.data?.valid;

                if (isValid) {
                    console.log('✅ [CCProfileView] Extension check valid. Token matched.');
                } else {
                    console.warn('❌ [CCProfileView] Token mismatch.');
                    alert('확장 프로그램 계정 연동 정보가 일치하지 않습니다.\n다시 연동해주세요.');
                }
            } catch (e) {
                console.error('Failed to validate token:', e);
            }
        };

        if (isInstalled) {
            console.log('✅ [CCProfileView] Extension Installed.');
            // 2. 응답은 했는데 NULL 인 경우 -> 미연동
            if (!extensionToken) {
                console.log('⚠️ [CCProfileView] Extension Installed but NOT linked.');
                alert('확장 프로그램이 연동되지 않았습니다.\n확장 프로그램 탭에서 계정을 연동해주세요.');
            } else {
                // 3. 응답했고 값 있음 -> 백엔드 검증
                console.log('🔗 [CCProfileView] Checking token validity...');
                checkTokenValidity(extensionToken);
            }
        } else {
            // 1. 응답 없음 (미설치)
            const timer = setTimeout(() => {
                if (!isInstalled) {
                    alert('백준 확장 프로그램이 설치되어 있지 않습니다.\n확장 프로그램 탭에서 설치해주세요.');
                }
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [isMe, isInstalled, extensionToken]);

    return (
        <div className="max-w-5xl mx-auto p-6 md:p-10 space-y-8 bg-white min-h-screen">
            {/* 1. Header Section */}
            <ProfileHeader user={user} isMe={isMe} />

            {/* 2. Extension Alert (Show only if not linked and it's me) */}
            {!user.bojId && isMe && (
                <ExtensionBanner />
            )}

            {/* 3. Stats Row */}
            <ProfileStatsRow user={user} />

            {/* 4. Tabs */}
            <div className="border-b border-gray-100 pt-4">
                <div className="flex gap-8">
                    {(Object.values(TABS) as string[]).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as TabKey)}
                            className={`pb-4 px-1 text-sm font-semibold transition-all relative ${activeTab === tab
                                ? 'text-gray-900'
                                : 'text-gray-400 hover:text-gray-600'
                                }`}
                        >
                            {tab}
                            {activeTab === tab && (
                                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-gray-900 rounded-t-full"></span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* 5. Content Area */}
            {activeTab === TABS.OVERVIEW && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    {/* Full Width Stroke/Activity Graph */}
                    <section>
                        <MonthlyActivityCard
                            selectedDate={selectedDate}
                            onDateSelect={setSelectedDate}
                        />
                    </section>

                    {/* Daily Details */}
                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-gray-900">📅 오늘의 활동</h3>
                            {isMe && (
                                <Link href="/profile/me/history" className="text-sm font-medium text-gray-500 hover:text-indigo-600 flex items-center gap-1">
                                    전체 히스토리 보기 →
                                </Link>
                            )}
                        </div>
                        <DailyActivityList date={selectedDate} />
                    </section>
                </div>
            )}

            {activeTab === TABS.EXTENSION && (
                <div className="py-6 animate-in fade-in zoom-in duration-300">
                    <ExtensionGuide user={user} />
                </div>
            )}
        </div>
    );
}
