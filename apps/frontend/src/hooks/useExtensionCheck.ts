import { useState, useEffect, useCallback } from 'react';

// 확장 프로그램과 주고받을 메시지 타입 정의
const MSG_CHECK = 'PEEKLE_CHECK_EXTENSION';
const MSG_INSTALLED = 'PEEKLE_EXTENSION_INSTALLED';

interface ExtensionMessage {
  type: string;
  token?: string;
}

export function useExtensionCheck() {
  const [isInstalled, setIsInstalled] = useState(false);
  const [extensionToken, setExtensionToken] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  const checkInstallation = useCallback(() => {
    setIsChecking(true);

    // 응답 핸들러
    const handleMessage = (event: MessageEvent<ExtensionMessage>) => {
      if (event.data?.type === MSG_INSTALLED) {
        setIsInstalled(true);
        if (event.data.token) {
          setExtensionToken(event.data.token);
        }
        setIsChecking(false); // 응답 받으면 즉시 확인 종료
      }
    };

    window.addEventListener('message', handleMessage);

    // 확인 요청 메시지 발송
    window.postMessage({ type: MSG_CHECK }, '*');

    // 타임아웃 설정 (500ms 동안 응답 없으면 미설치로 간주)
    const timer = setTimeout(() => {
      setIsChecking(false);
    }, 500);

    return () => {
      window.removeEventListener('message', handleMessage);
      clearTimeout(timer);
    };
  }, []);

  // 마운트 시 최초 1회 체크
  useEffect(() => {
    const cleanup = checkInstallation();
    return cleanup;
  }, [checkInstallation]);

  return { isInstalled, extensionToken, isChecking, checkInstallation };
}
