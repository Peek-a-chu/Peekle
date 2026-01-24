'use client';

import { useState, useEffect, useRef } from 'react';
import { UserProfile } from '../types';
import { useExtensionCheck } from '@/hooks/useExtensionCheck';

interface Props {
    user: UserProfile;
}

type ExtensionStatus = 'NOT_INSTALLED' | 'INSTALLED' | 'LINKED' | 'MISMATCH';

export function ExtensionGuide({ user }: Props) {
    const [status, setStatus] = useState<ExtensionStatus>('NOT_INSTALLED');
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showToken, setShowToken] = useState(false);

    // 커스텀 훅 사용
    const { isInstalled, extensionToken, checkInstallation } = useExtensionCheck();
    const [isPolling, setIsPolling] = useState(false);
    const pollingRef = useRef<NodeJS.Timeout | null>(null);

    // 1. 설치 및 연동 감지 시 상태 업데이트
    useEffect(() => {
        const verifyToken = async (token: string) => {
            try {
                const res = await fetch('/api/extension/validate', {
                    headers: { 'X-Peekle-Token': token }
                });
                const json = await res.json();
                if (json.data?.valid) {
                    setStatus('LINKED');
                } else {
                    setStatus('MISMATCH');
                }
            } catch (e) {
                console.error(e);
                setStatus('MISMATCH');
            }
            setIsPolling(false);
            setIsLoading(false);
        };

        if (extensionToken) {
            // 토큰이 있으면 유효성 검증
            verifyToken(extensionToken);
        } else if (isInstalled) {
            // 설치는 됐는데 토큰이 없음 -> 연동 필요
            setStatus('INSTALLED');
            setIsPolling(false);
            setIsLoading(false);
        } else {
            // 미설치
            // useExtensionCheck may be async or slow to detect, so we might want a timeout or rely on default
            // But for now, if hook says not installed, we assume not installed.
            // Wait, isInstalled is false by default. It might flip to true later.
            // So we shouldn't set isLoading false immediately if we expect a delay.
            // But we don't know if it will ever flip.
            // Let's set a small timeout to avoid flash of NOT_INSTALLED if detection is fast?
            // Or just set false. Users complained about empty screen (loading).
            // So showing 'Checking...' is better than showing 'Not Installed' immediately if it is actually installed.
            // But useExtensionCheck usually updates state.
            // Lets just set isLoading(false) here.
            setStatus('NOT_INSTALLED');
            setIsLoading(false);
        }
    }, [isInstalled, extensionToken]);

    // 2. 폴링 로직 (버튼 클릭 시 시작)
    useEffect(() => {
        if (isPolling && status === 'NOT_INSTALLED') {
            pollingRef.current = setInterval(() => {
                console.log('Extensions Detection: Pinging...');
                checkInstallation();
            }, 3000);
        }

        return () => {
            if (pollingRef.current) clearInterval(pollingRef.current);
        };
    }, [isPolling, status, checkInstallation]);

    const handleInstallClick = () => {
        window.open(
            'https://chromewebstore.google.com/detail/beminaoknafglpdlnjlconallpkhfgdm',
            '_blank'
        );
        // 설치 버튼 누르면 감지 시작
        setIsPolling(true);
    };

    // 공통 연동 함수 (regenerate 옵션만 다르게)
    const handleLinkAccount = async (regenerate: boolean) => {
        const confirmMsg = regenerate
            ? '토큰을 재발급하시겠습니까?\n기존에 연동된 기기에서는 로그아웃 처리됩니다.'
            : '현재 계정으로 연동하시겠습니까?';

        if (regenerate && !confirm(confirmMsg)) return;

        setIsSubmitting(true);
        try {
            const res = await fetch('/api/extension/token', {
                method: 'POST',
                body: JSON.stringify({ regenerate }),
            });
            const json = await res.json();
            const newToken = json.data?.extensionToken;

            if (newToken) {
                window.postMessage({
                    type: 'PEEKLE_SET_TOKEN',
                    token: newToken
                }, '*');

                alert(regenerate ? '토큰이 재발급되었습니다.' : '계정 연동이 완료되었습니다!');
                // 상태 갱신을 위해 다시 체크
                checkInstallation();
                if (!regenerate) setStatus('LINKED'); // 임시 UI 반영
            } else {
                alert('토큰 발급 실패');
            }
        } catch (e) {
            console.error(e);
            alert('오류 발생');
        } finally {
            setIsSubmitting(false);
        }
    };

    const steps = [
        {
            step: 1,
            title: '확장 프로그램 설치',
            desc: 'Chrome 웹 스토어에서 설치',
            isDone: status !== 'NOT_INSTALLED',
            isActive: status === 'NOT_INSTALLED',
        },
        {
            step: 2,
            title: '계정 연동',
            desc: '백준 계정과 확장 프로그램 연동',
            isDone: status === 'LINKED',
            isActive: status === 'INSTALLED' || status === 'MISMATCH',
        },
        {
            step: 3,
            title: '사용 시작',
            desc: '스터디 방, 게임 방에서 문제 풀이 시작',
            isDone: false,
            isActive: status === 'LINKED',
        },
    ];

    if (isLoading) {
        return (
            <div className="bg-white border border-gray-200 rounded-xl p-8 max-w-4xl mx-auto min-h-[400px] flex flex-col justify-center items-center">
                <div className="w-10 h-10 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                <p className="text-gray-500 font-medium">확장 프로그램 상태 확인 중...</p>
            </div>
        );
    }

    return (
        <div className="bg-white border border-gray-200 rounded-xl p-8 max-w-4xl mx-auto animate-fade-in">
            {/* Header */}
            <div className="mb-8">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <span>🧩</span> 백준 확장 프로그램
                </h2>
                <p className="text-gray-500 text-sm mt-1">
                    문제 제출 기능을 사용하려면 확장 프로그램을 설치하고 연동해주세요.
                </p>
            </div>

            {/* Status Banner */}
            <div className={`rounded-lg p-5 mb-8 flex items-start gap-4 ${status === 'LINKED' ? 'bg-green-50 border border-green-100' :
                status === 'MISMATCH' ? 'bg-orange-50 border border-orange-100' :
                    status === 'INSTALLED' ? 'bg-blue-50 border border-blue-100' :
                        'bg-gray-100 border border-gray-200'
                }`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${status === 'LINKED' ? 'text-green-600' :
                    status === 'MISMATCH' ? 'text-orange-600' :
                        status === 'INSTALLED' ? 'text-blue-600' :
                            'text-gray-500'
                    }`}>
                    {status === 'LINKED' ? '✅' : status === 'MISMATCH' ? '⚠️' : status === 'INSTALLED' ? 'ℹ️' : '⚠️'}
                </div>
                <div>
                    <h3 className={`font-bold text-sm ${status === 'LINKED' ? 'text-green-900' :
                        status === 'MISMATCH' ? 'text-orange-900' :
                            status === 'INSTALLED' ? 'text-blue-900' :
                                'text-gray-900'
                        }`}>
                        {status === 'LINKED' ? '연동 완료' :
                            status === 'MISMATCH' ? '계정 정보 불일치 (재연동 필요)' :
                                status === 'INSTALLED' ? '설치 완료, 계정 연동이 필요합니다' :
                                    '확장 프로그램이 설치되지 않았습니다'}
                    </h3>
                    <p className={`text-sm mt-1 ${status === 'LINKED' ? 'text-green-700' :
                        status === 'MISMATCH' ? 'text-orange-700' :
                            status === 'INSTALLED' ? 'text-blue-700' :
                                'text-gray-600'
                        }`}>
                        {status === 'LINKED' ? '모든 기능이 정상 동작 중입니다.' :
                            status === 'MISMATCH' ? '확장 프로그램에 저장된 계정과 현재 로그인된 계정이 다릅니다.' :
                                status === 'INSTALLED' ? '아래 버튼을 클릭하여 계정을 연동해주세요.' :
                                    'Chrome 웹 스토어에서 확장 프로그램을 설치해주세요.'}
                    </p>
                </div>
            </div>


            {/* Stepper */}
            <div className="space-y-8 pl-2">
                {steps.map((s, idx) => (
                    <div key={s.step} className="relative flex gap-4">
                        {/* Vertical Line */}
                        {idx !== steps.length - 1 && (
                            <div className={`absolute left-[15px] top-8 bottom-[-32px] w-0.5 ${s.isDone ? 'bg-green-500' : 'bg-gray-200'
                                }`}></div>
                        )}

                        {/* Step Circle */}
                        <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-colors ${s.isDone ? 'bg-green-500 text-white' :
                            s.isActive ? 'bg-gray-900 text-white' :
                                'bg-gray-100 text-gray-400'
                            }`}>
                            {s.isDone ? '✓' : s.step}
                        </div>

                        {/* Content */}
                        <div className={`${s.isActive || s.isDone ? 'opacity-100' : 'opacity-40'} pt-1`}>
                            <h4 className="font-bold text-gray-900 text-sm">{s.title}</h4>
                            <p className="text-sm text-gray-500 mt-0.5">{s.desc}</p>
                            {/* Debug Info in the stepper for Step 2 if linked */}
                            {s.step === 2 && extensionToken && (
                                <div className="mt-3">
                                    <p className="text-xs font-bold text-gray-500 uppercase mb-1 tracking-wider">Verification Token</p>
                                    <div className="mt-2 text-xs text-gray-500 font-mono bg-gray-50 p-2 rounded flex items-center justify-between gap-2 w-[280px]">
                                        <span className="truncate">
                                            {showToken ? extensionToken : '••••••••••••••••••••••••'}
                                        </span>
                                        <button
                                            onClick={() => setShowToken(!showToken)}
                                            className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-600 transition-colors"
                                            title={showToken ? '토큰 숨기기' : '토큰 보기'}
                                        >
                                            {showToken ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                                                    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                                                    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7c.44 0 .87-.03 1.28-.09" />
                                                    <line x1="2" x2="22" y1="2" y2="22" />
                                                </svg>
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                                                    <circle cx="12" cy="12" r="3" />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Actions */}
            <div className="mt-10 flex gap-3">
                {status === 'NOT_INSTALLED' && (
                    <>
                        <button
                            onClick={handleInstallClick}
                            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 flex items-center gap-2 shadow-sm"
                        >
                            {isPolling ? '⏳ 감지 중...' : '⬇️ 확장 프로그램 설치'}
                        </button>
                    </>
                )}

                {(status === 'INSTALLED' || status === 'MISMATCH') && (
                    <button
                        onClick={() => handleLinkAccount(false)}
                        disabled={isSubmitting}
                        className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 disabled:bg-blue-400 flex items-center gap-2"
                    >
                        {isSubmitting ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                처리 중...
                            </>
                        ) : (
                            '🔗 계정 연동하기 (기존 토큰 불러오기)'
                        )}
                    </button>
                )}

                {status === 'LINKED' && (
                    <button
                        onClick={() => handleLinkAccount(true)}
                        disabled={isSubmitting}
                        className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:bg-gray-50 disabled:text-gray-400 flex items-center gap-2"
                    >
                        {isSubmitting ? (
                            <>
                                <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin"></div>
                                처리 중...
                            </>
                        ) : (
                            '🔄 토큰 재발급 (보안 갱신 - 모든 기기 로그아웃)'
                        )}
                    </button>
                )}
            </div>

            {/* Linked Features List */}
            {status === 'LINKED' && (
                <div className="mt-10 border-t border-gray-100 pt-8">
                    <h4 className="font-bold text-sm text-gray-900 mb-4">사용 가능한 기능</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <span className="text-green-500">✓</span> 스터디 방에서 문제 풀기
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <span className="text-green-500">✓</span> 게임 방에서 실시간 대전
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <span className="text-green-500">✓</span> 자동 코드 제출
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <span className="text-green-500">✓</span> 실시간 결과 확인
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
