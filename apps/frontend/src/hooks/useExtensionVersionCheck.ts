import { useState, useEffect } from 'react';

interface ExtensionVersionInfo {
    latestVersion: string;
    minVersion: string;
    downloadUrl: string;
    releaseNotes?: string;
}

const VERSION_JSON_URL = 'https://pub-09a6ac9bff27427fabb6a07fc05033c0.r2.dev/extension/version.json';

export function useExtensionVersionCheck() {
    const [versionInfo, setVersionInfo] = useState<ExtensionVersionInfo | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const fetchVersionInfo = async () => {
            try {
                const response = await fetch(VERSION_JSON_URL, {
                    cache: 'no-cache', // Always get latest version info
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch version info');
                }

                const data: ExtensionVersionInfo = await response.json();
                setVersionInfo(data);
            } catch (err) {
                console.error('[Version Check] Failed to fetch version info:', err);
                setError(err instanceof Error ? err : new Error('Unknown error'));

                // Fallback to hardcoded version if R2 fails
                setVersionInfo({
                    latestVersion: '0.0.9',
                    minVersion: '0.0.9',
                    downloadUrl: 'https://pub-09a6ac9bff27427fabb6a07fc05033c0.r2.dev/extension/peekle-extension.zip',
                });
            } finally {
                setIsLoading(false);
            }
        };

        void fetchVersionInfo();
    }, []);

    return { versionInfo, isLoading, error };
}
