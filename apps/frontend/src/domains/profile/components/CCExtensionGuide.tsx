import { useState, useEffect, useRef } from 'react';
import { Puzzle } from 'lucide-react';
import { ExtensionStatus, UserProfile } from '../types';
import { ConfirmModal, ActionModal } from '@/components/common/Modal';

interface Props {
  user: UserProfile;
  isInstalled: boolean;
  extensionVersion: string | null;
  extensionToken: string | null;
  checkInstallation: () => void;
  status: ExtensionStatus;
  isLoading: boolean;
  onRegisterBojId?: () => void;
}

interface TokenResponse {
  success?: boolean;
  data?: {
    extensionToken?: string;
  };
}

export function CCExtensionGuide({
  user,
  checkInstallation,
  extensionToken,
  status,
  isLoading,
  onRegisterBojId,
}: Props) {
  const DOWNLOAD_URL = 'https://pub-09a6ac9bff27427fabb6a07fc05033c0.r2.dev/extension/peekle-extension.zip';

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);

  // Modal State
  const [modal, setModal] = useState<{
    isOpen: boolean;
    message: string;
    variant?: 'default' | 'destructive';
  }>({
    isOpen: false,
    message: '',
    variant: 'default',
  });

  // Confirmation Modal State (for regenerate)
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; regenerate: boolean }>({
    isOpen: false,
    regenerate: false,
  });
  const [showBojNudge, setShowBojNudge] = useState(false);

  // 폴링을 위한 로컬 상태는 유지 (설치 감지용)
  const [isPolling, setIsPolling] = useState(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // 1. 상태 계산 로직 제거 -> 부모 컴포넌트(CCProfileView)에서 담당

  // 2. 폴링 로직 (버튼 클릭 시 시작) -> 제거됨 (사용자 요청: 한번하고 없으면 멈춤)
  // useEffect(() => {
  //   if (isPolling && status === 'NOT_INSTALLED') {
  //     pollingRef.current = setInterval(() => {
  //       console.log('Extensions Detection: Pinging...');
  //       checkInstallation();
  //     }, 3000);
  //   } else if (status !== 'NOT_INSTALLED') {
  //     setIsPolling(false);
  //   }

  //   return () => {
  //     if (pollingRef.current) clearInterval(pollingRef.current);
  //   };
  // }, [isPolling, status, checkInstallation]);

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
    // 수동 설치 모드: 설치 페이지로 이동하지 않고 감지 시작
    setIsPolling(true);
    checkInstallation(); // 즉시 한번 체크

    // 2초 뒤에도 여전히 NOT_INSTALLED라면 로딩 상태 해제 (한번만 체크하고 멈춤)
    setTimeout(() => {
      // 상태는 props로 들어오므로 여기서는 isPolling만 끔
      // checkInstallation 내부적으로도 타임아웃이 있지만, UI 스피너 제어를 위해 추가
      setIsPolling(false);
    }, 2500);
  };

  // 공통 연동 함수 (regenerate 옵션만 다르게)
  const handleLinkAccount = async (regenerate: boolean) => {
    // BOJ 닉네임 등록 여부 확인
    if (!user.bojId) {
      setShowBojNudge(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/users/me/extension-token', {
        method: 'POST',
        body: JSON.stringify({ regenerate }),
      });
      const json = (await res.json()) as TokenResponse;
      const newToken = json.data?.extensionToken;

      if (newToken) {
        window.postMessage(
          {
            type: 'PEEKLE_SET_TOKEN',
            token: newToken,
            user: user, // 사용자 정보(이미지 포함) 함께 전송
          },
          '*',
        );

        setModal({
          isOpen: true,
          message: regenerate ? '토큰이 재발급되었습니다.' : '계정 연동이 완료되었습니다!',
          variant: 'default',
        });
        // 상태 갱신을 위해 다시 체크
        checkInstallation();
        // 부모 컴포넌트가 checkInstallation 호출 -> 상태 업데이트 -> props 변경됨
      } else {
        setModal({ isOpen: true, message: '토큰 발급 실패', variant: 'destructive' });
      }
    } catch (e) {
      console.error(e);
      setModal({ isOpen: true, message: '오류가 발생했습니다.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    {
      step: 1,
      title: '확장 프로그램 설치',
      desc: '수동 설치 가이드 또는 스토어 이용',
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
      <div className="bg-card border border-border rounded-xl p-8 max-w-4xl mx-auto min-h-[400px] flex flex-col justify-center items-center">
        <div className="w-10 h-10 border-4 border-muted border-t-primary rounded-full animate-spin mb-4"></div>
        <p className="text-muted-foreground font-medium">확장 프로그램 상태 확인 중...</p>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-2xl bg-card overflow-hidden p-5">
      {/* Header */}
      <div className="mb-6">
        <h3 className="font-bold text-foreground flex items-center gap-2">
          <Puzzle className="w-5 h-5 text-primary" /> 백준 확장 프로그램
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          문제 제출 기능을 사용하려면 확장 프로그램을 설치하고 연동해주세요.
        </p>
      </div>

      {/* Status Banner */}
      <div
        className={`rounded-lg p-5 mb-8 flex items-start gap-4 ${status === 'LINKED'
          ? 'bg-green-500/10 border border-green-500/20'
          : status === 'MISMATCH'
            ? 'bg-orange-500/10 border border-orange-500/20'
            : status === 'INSTALLED'
              ? 'bg-blue-500/10 border border-blue-500/20'
              : 'bg-muted border border-border'
          }`}
      >
        <div
          className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${status === 'LINKED'
            ? 'text-green-600 dark:text-green-400'
            : status === 'MISMATCH'
              ? 'text-orange-600 dark:text-orange-400'
              : status === 'INSTALLED'
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-muted-foreground'
            }`}
        >
          {status === 'LINKED'
            ? '✅'
            : status === 'MISMATCH'
              ? '⚠️'
              : status === 'INSTALLED'
                ? 'ℹ️'
                : '⚠️'}
        </div>
        <div>
          <h3
            className={`font-bold text-sm ${status === 'LINKED'
              ? 'text-green-700 dark:text-green-300'
              : status === 'MISMATCH'
                ? 'text-orange-700 dark:text-orange-300'
                : status === 'INSTALLED'
                  ? 'text-blue-700 dark:text-blue-300'
                  : 'text-foreground'
              }`}
          >
            {status === 'LINKED'
              ? '연동 완료'
              : status === 'MISMATCH'
                ? '계정 정보 불일치 (재연동 필요)'
                : status === 'INSTALLED'
                  ? '설치 완료, 계정 연동이 필요합니다'
                  : '확장 프로그램이 설치되지 않았습니다'}
          </h3>
          <p
            className={`text-sm mt-1 ${status === 'LINKED'
              ? 'text-green-600/80 dark:text-green-400/80'
              : status === 'MISMATCH'
                ? 'text-orange-600/80 dark:text-orange-400/80'
                : status === 'INSTALLED'
                  ? 'text-blue-600/80 dark:text-blue-400/80'
                  : 'text-muted-foreground'
              }`}
          >
            {status === 'LINKED'
              ? '모든 기능이 정상 동작 중입니다.'
              : status === 'MISMATCH'
                ? '확장 프로그램에 저장된 계정과 현재 로그인된 계정이 다릅니다.'
                : status === 'INSTALLED'
                  ? '아래 버튼을 클릭하여 계정을 연동해주세요.'
                  : '확장 프로그램 수동 설치 가이드에 따라 설치를 진행해주세요.'}
          </p>
        </div>
      </div>

      {/* Stepper */}
      <div className="space-y-8 pl-2">
        {steps.map((s, idx) => (
          <div key={s.step} className="relative flex gap-4">
            {/* Vertical Line */}
            {idx !== steps.length - 1 && (
              <div
                className={`absolute left-[15px] top-8 bottom-[-32px] w-0.5 ${s.isDone ? 'bg-green-500' : 'bg-border'
                  }`}
              ></div>
            )}

            {/* Step Circle */}
            <div
              className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-colors ${s.isDone
                ? 'bg-green-500 text-white'
                : s.isActive
                  ? 'bg-foreground text-background'
                  : 'bg-muted text-muted-foreground'
                }`}
            >
              {s.isDone ? '✓' : s.step}
            </div>

            {/* Content */}
            <div className={`${s.isActive || s.isDone ? 'opacity-100' : 'opacity-40'} pt-1`}>
              <h4 className="font-bold text-foreground text-sm">{s.title}</h4>
              <p className="text-sm text-muted-foreground mt-0.5">{s.desc}</p>
              {/* Debug Info in the stepper for Step 2 if linked */}
              {s.step === 2 && extensionToken && (
                <div className="mt-3">
                  <p className="text-xs font-bold text-muted-foreground uppercase mb-1 tracking-wider">
                    Verification Token
                  </p>
                  <div className="mt-2 text-xs text-muted-foreground font-mono bg-muted/50 p-2 rounded flex items-center justify-between gap-2 w-[280px]">
                    <span className="truncate">
                      {showToken ? extensionToken : '••••••••••••••••••••••••'}
                    </span>
                    <button
                      onClick={() => setShowToken(!showToken)}
                      className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
                      title={showToken ? '토큰 숨기기' : '토큰 보기'}
                    >
                      {showToken ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                          <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                          <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7c.44 0 .87-.03 1.28-.09" />
                          <line x1="2" x2="22" y1="2" y2="22" />
                        </svg>
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
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
          <div className="flex flex-col gap-4 w-full items-center">
            <div className="flex gap-3">
              <button
                onClick={() => {
                  window.open('https://chromewebstore.google.com/detail/lgcgoodhgjalkdncpnhnjaffnnpmmcjn?utm_source=item-share-cb', '_blank');
                  handleInstallClick();
                }}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 flex items-center gap-2 shadow-sm"
              >
                {isPolling ? '⏳ 확인 중...' : '📥 스토어에서 다운로드'}
              </button>
            </div>
            {isPolling && (
              <p className="text-xs text-muted-foreground animate-pulse">
                확장 프로그램이 설치되면 자동으로 감지합니다...
              </p>
            )}
          </div>
        )}

        {(status === 'INSTALLED' || status === 'MISMATCH') && (
          <div className="flex flex-col gap-2">
            <button
              onClick={() => void handleLinkAccount(false)}
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
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
          </div>
        )}

        {status === 'LINKED' && (
          <button
            onClick={() => setConfirmModal({ isOpen: true, regenerate: true })}
            disabled={isSubmitting}
            className="px-5 py-2.5 bg-background border border-border text-foreground rounded-lg text-sm font-medium hover:bg-muted/50 disabled:bg-muted disabled:text-muted-foreground flex items-center gap-2"
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
        <div className="mt-10 border-t border-border pt-8">
          <h4 className="font-bold text-sm text-foreground mb-4">사용 가능한 기능</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="text-green-500">✓</span> 스터디 방에서 문제 풀기
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="text-green-500">✓</span> 게임 방에서 실시간 대전
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="text-green-500">✓</span> 자동 코드 제출
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="text-green-500">✓</span> 실시간 결과 확인
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      <ConfirmModal
        isOpen={modal.isOpen}
        onClose={() => setModal({ isOpen: false, message: '', variant: 'default' })}
        title="알림"
        description={modal.message}
        variant={modal.variant}
      />

      <ActionModal
        isOpen={showBojNudge}
        onClose={() => setShowBojNudge(false)}
        onConfirm={() => {
          setShowBojNudge(false);
          onRegisterBojId?.();
        }}
        title="BOJ 닉네임 등록 필요"
        description={
          <>
            확장 프로그램을 연동하려면 먼저 <strong>백준(BOJ) 닉네임</strong>을 등록해야 합니다.
            <br />
            <br />
            프로필 수정 화면에서 닉네임을 등록하고 다시 시도해주세요.
          </>
        }
        confirmText="등록하러 가기"
        cancelText="나중에"
        variant="default"
      />

      {/* Confirmation Modal for Token Regeneration */}
      <ActionModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, regenerate: false })}
        onConfirm={() => {
          setConfirmModal({ isOpen: false, regenerate: false });
          void handleLinkAccount(confirmModal.regenerate);
        }}
        title="토큰 재발급"
        description={
          <>
            토큰을 재발급하시겠습니까?
            <br />
            <br />
            기존에 연동된 기기에서는 로그아웃 처리됩니다.
          </>
        }
        confirmText="재발급"
        cancelText="취소"
        variant="destructive"
        isLoading={isSubmitting}
      />

      {/* Manual Installation Modal */}
      <ActionModal
        isOpen={showManualModal}
        onClose={() => setShowManualModal(false)}
        onConfirm={() => {
          window.open(DOWNLOAD_URL, '_blank');
          handleInstallClick();
        }}
        title="확장 프로그램 수동 설치 가이드"
        confirmText="Zip 다운로드"
        cancelText="닫기"
        description={
          <div className="space-y-4 text-sm text-left">
            <p className="text-muted-foreground">
              스토어 심사 지연으로 인해 현재 수동 설치가 필요합니다. 아래 절차를 따라주세요.
            </p>

            <div className="space-y-3 bg-muted/50 p-4 rounded-lg border border-border">
              <div className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] shrink-0 mt-0.5">1</span>
                <span><strong>Zip 파일 다운로드:</strong> 아래 버튼을 눌러 압축 파일을 다운로드하고 압축을 해제합니다.</span>
              </div>
              <div className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] shrink-0 mt-0.5">2</span>
                <span><strong>확장 프로그램 설정 이동:</strong> 크롬 주소창에 <code className="bg-muted px-1 rounded">chrome://extensions</code>를 입력합니다.</span>
              </div>
              <div className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] shrink-0 mt-0.5">3</span>
                <span><strong>개발자 모드 활성화:</strong> 우측 상단의 <strong>개발자 모드(Developer mode)</strong> 스위치를 켭니다.</span>
              </div>
              <div className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] shrink-0 mt-0.5">4</span>
                <span><strong>압축해제된 확장 설치:</strong> 좌측 상단의 <strong>압축해제된 확장 프로그램을 로드합니다(Load unpacked)</strong> 버튼을 누르고, 압축을 푼 폴더를 선택합니다.</span>
              </div>
            </div>

            <p className="text-[11px] text-orange-500 font-medium">
              ※ 주의: 설치 후 해당 폴더를 삭제하면 확장 프로그램이 작동하지 않습니다. 안전한 곳에 보관해주세요.
            </p>
          </div>
        }
      />
    </div>
  );
}
