import { useState, useEffect, useCallback } from 'react';

// 확장 프로그램과 주고받을 메시지 타입 정의
const MSG_CHECK = 'PEEKLE_CHECK_EXTENSION';
const MSG_INSTALLED = 'PEEKLE_EXTENSION_INSTALLED';

export function useExtensionCheck() {
    const [isInstalled, setIsInstalled] = useState(false);
    const [extensionToken, setExtensionToken] = useState<string | null>(null);

    const checkInstallation = useCallback(() => {
        // 이미 설치 확인되었으면 패스 (토큰 업데이트를 위해 조건 완화 가능)
        // if (isInstalled) return;

        // 응답 핸들러
        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type === MSG_INSTALLED) {
                setIsInstalled(true);
                if (event.data.token) {
                    setExtensionToken(event.data.token);
                }
            }
        };

        window.addEventListener('message', handleMessage);

        // 확인 요청 메시지 발송
        window.postMessage({ type: MSG_CHECK }, '*');
        // console.log('[useExtensionCheck] Ping sent...');

        // 클린업: 너무 빨리 지우면 응답을 못 받을 수 있으니
        // 실제로는 이벤트 리스너를 계속 유지하거나 타임아웃 후에 지워야 하지만,
        // 여기서는 useEffect의 cleanup 함수, 또는 간단히 유지 (가벼운 리스너이므로)
        return () => {
            window.removeEventListener('message', handleMessage);
        };
    }, [isInstalled]);

    // 마운트 시 최초 1회 체크
    useEffect(() => {
        checkInstallation();
    }, [checkInstallation]);

    return { isInstalled, extensionToken, checkInstallation };
}
