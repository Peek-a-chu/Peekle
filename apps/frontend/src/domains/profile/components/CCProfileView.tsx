'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { ExtensionStatus, UserProfile } from '../types';
import { CCProfileHeader } from './CCProfileHeader';
import { CCProfileStatsRow } from './CCProfileStatsRow';
import ActivityStreak from '@/domains/home/components/ActivityStreak';
import LearningTimeline from '@/domains/home/components/LearningTimeline';
import { CCExtensionBanner } from './CCExtensionBanner';
import { CCExtensionGuide } from './CCExtensionGuide';
import { useExtensionCheck } from '@/hooks/useExtensionCheck';

interface Props {
  user: UserProfile;
  isMe: boolean;
}

interface ValidateResponse {
  success?: boolean;
  data?: {
    valid?: boolean;
  };
}

const TABS = {
  OVERVIEW: '개요',
  EXTENSION: '확장 프로그램',
} as const;

type TabKey = (typeof TABS)[keyof typeof TABS];

export function CCProfileView({ user, isMe }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>(TABS.OVERVIEW);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const { isInstalled, extensionToken, checkInstallation } = useExtensionCheck();

  // Extension Check State lifted from CCExtensionGuide
  const [status, setStatus] = useState<ExtensionStatus>('NOT_INSTALLED');
  const [isLoading, setIsLoading] = useState(true);

  // 확장 프로그램 상태 체크 및 로깅
  useEffect(() => {
    if (!isMe) return;

    const checkTokenValidity = async (token: string) => {
      try {
        const res = await fetch(`/api/users/me/validate-token`, {
          headers: { 'X-Peekle-Token': token },
        });
        const json = (await res.json()) as ValidateResponse;

        console.log('Token validation response:', json);

        const isValid = json.data?.valid;

        if (isValid) {
          console.log('✅ [CCProfileView] Extension check valid. Token matched.');
          setStatus('LINKED');
        } else {
          console.warn('❌ [CCProfileView] Token mismatch.');
          setStatus('MISMATCH');
          // alert('확장 프로그램 계정 연동 정보가 일치하지 않습니다.\n다시 연동해주세요.');
        }
      } catch (e) {
        console.error('Failed to validate token:', e);
        setStatus('MISMATCH');
      } finally {
        setIsLoading(false);
      }
    };

    if (extensionToken) {
      // 3. 응답했고 값 있음 -> 백엔드 검증
      console.log('🔗 [CCProfileView] Checking token validity...');
      void checkTokenValidity(extensionToken);
    } else if (isInstalled) {
      // 2. 응답은 했는데 NULL 인 경우 -> 미연동
      console.log('⚠️ [CCProfileView] Extension Installed but NOT linked.');
      setStatus('INSTALLED');
      setIsLoading(false);
    } else {
      // 1. 응답 없음 (미설치)
      setStatus('NOT_INSTALLED');
      setIsLoading(false);
    }
  }, [isMe, isInstalled, extensionToken]);

  return (
    <div className="max-w-5xl p-6 md:p-10 space-y-8 min-h-screen">
      <div className="p-6 border border-card-border rounded-xl bg-card">
        {/* 1. Header Section */}
        <CCProfileHeader user={user} isMe={isMe} />

        {/* 2. Extension Alert (Show only if not linked and it's me) */}
        {!user.bojId && isMe && <CCExtensionBanner />}
        {/* 3. Stats Row */}
        <CCProfileStatsRow user={user} />
      </div>

      {/* 4. Tabs (Segmented Control) */}
      <div className="bg-secondary/30 p-1 rounded-xl">
        <div className={`grid gap-1 ${isMe ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {(Object.values(TABS) as string[]).filter(tab => isMe || tab !== TABS.EXTENSION).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as TabKey)}
              className={`w-full py-2.5 text-sm font-medium rounded-lg transition-all ${activeTab === tab
                ? 'bg-card text-foreground shadow-sm ring-1 ring-black/5'
                : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* 5. Content Area */}
      {activeTab === TABS.OVERVIEW && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="border border-card-border rounded-2xl bg-card overflow-hidden">
            {/* 활동 스트릭 */}
            <ActivityStreak onDateSelect={setSelectedDate} />

            {/* 학습 타임라인 */}
            <LearningTimeline selectedDate={selectedDate} showHistoryLink={isMe} />
          </div>
        </div>
      )}

      {activeTab === TABS.EXTENSION && isMe && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <CCExtensionGuide
            user={user}
            isInstalled={isInstalled}
            extensionToken={extensionToken}
            checkInstallation={checkInstallation}
            status={status}
            isLoading={isLoading}
          />
        </div>
      )}
    </div>
  );
}
