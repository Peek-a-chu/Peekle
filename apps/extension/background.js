// --- Configuration ---
const IS_LOCAL = true; // false = 배포(Production), true = 로컬(Local)
// 통합된 Base URL (API & Frontend 모두 동일 도메인/포트 사용)
// Local: 확장 프로그램은 Backend(8080)로 직접 연결
// Prod: Nginx가 요청을 분기함 (443 -> Frontend / Backend)
const BASE_URL = IS_LOCAL
    ? 'http://localhost:3000'
    : 'https://i14a408.p.ssafy.io';

const API_BASE_URL = IS_LOCAL
    ? 'http://localhost:8080'  // 확장 프로그램은 백엔드 직접 연결
    : BASE_URL;
const FRONTEND_BASE_URL = BASE_URL; // Alias for compatibility

// --- Baekjoon Solver Logic ---

const PROCESSED_SUBMISSIONS_KEY = 'processed_submissions';
const PEEKLE_TOKEN_KEY = 'peekle_token';

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'CHECK_ENV') {
        sendResponse({
            isLocal: IS_LOCAL,
            frontendUrl: FRONTEND_BASE_URL,
            apiUrl: API_BASE_URL
        });
        return true;
    } else if (request.type === 'SOLVED') {
        handleSolvedSubmission(request.payload, sender);
        return true;
    } else if (request.type === 'SAVE_PENDING_SUBMISSION') {
        console.log('[Background] Received SAVE_PENDING_SUBMISSION:', request.payload);

        chrome.storage.local.set({
            'pending_submission': {
                ...request.payload,
                // Ensure sourceType is preserved or default to EXTENSION
                sourceType: request.payload.sourceType || 'EXTENSION',
                timestamp: Date.now()
            }
        }, () => {
            console.log('[Background] pending_submission saved to storage.');
            // Open new tab
            const bojId = request.payload.externalId || request.payload.problemId;
            const targetUrl = `https://www.acmicpc.net/submit/${bojId}`;
            console.log(`[Background] Opening new tab: ${targetUrl}`);
            chrome.tabs.create({ url: targetUrl });
            sendResponse({ success: true });
        });
        return true;
    } else if (request.type === 'CLEAR_PENDING_SUBMISSION') {
        console.log('[Background] Received CLEAR_PENDING_SUBMISSION. Clearing storage.');
        chrome.storage.local.remove('pending_submission', () => {
            sendResponse({ success: true });
        });
        return true;
    }
    return true; // Keep channel open
});


// storage에서 토큰 가져오기 (콜백 API를 Promise로 래핑)
function getPeekleToken() {
    return new Promise((resolve) => {
        try {
            chrome.storage.local.get([PEEKLE_TOKEN_KEY], (res) => {
                resolve(res[PEEKLE_TOKEN_KEY] || null);
            });
        } catch (e) {
            resolve(null);
        }
    });
}

// Solved.ac API Helper
async function getProblemInfo(problemId) {
    try {
        const response = await fetch(`https://solved.ac/api/v3/problem/show?problemId=${problemId}`);
        if (response.ok) {
            return await response.json();
        }
    } catch (error) {
        console.error('Failed to fetch problem info:', error);
    }
    return null;
}



async function sendToBackend(data, studyProblemId = null) {
    try {
        const url = studyProblemId
            ? `${API_BASE_URL}/api/studies/problems/${studyProblemId}/submit`
            : `${API_BASE_URL}/api/submissions/`;

        console.log(`Sending submission to ${studyProblemId ? 'Study' : 'General'} backend:`, data);

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            const json = await response.json();
            console.log('Backend sync successful', json);
            return json.data;
        } else {
            console.error('Backend sync failed:', response.status);
            return null;
        }
    } catch (error) {
        console.error('Failed to send to backend:', error);
        return null;
    }
}

async function handleSolvedSubmission(payload, sender) {
    const { submitId, problemId, result, isSuccess, username, memory, time, language, code, studyId, sourceType } = payload;

    // Retrieve both processed history and pending context
    chrome.storage.local.get([PROCESSED_SUBMISSIONS_KEY, 'pending_submission'], async (items) => {
        const processed = items[PROCESSED_SUBMISSIONS_KEY] || {};
        const pending = items['pending_submission'];

        if (processed[submitId]) {
            console.log(`Submission ${submitId} already processed.`);
            return;
        }

        // New submission
        console.log(`New submission detected: ${problemId} by ${username} (Success: ${isSuccess})`);

        // Fetch problem details (tier, title)
        const problemInfo = await getProblemInfo(problemId);

        // --- Context Detection (Study vs. General) ---
        // Use studyId and sourceType from payload (already sent by content.js)
        let targetStudyId = studyId || null;
        let targetSourceType = sourceType || 'EXTENSION';

        console.log(`[Debug] Context from payload - StudyId: ${targetStudyId}, SourceType: ${targetSourceType}`);

        // Clean up pending_submission if it exists and matches
        if (pending && !pending.consumed) {
            console.log('[Debug] Pending submission still active (not consumed). Skipping cleanup.');
        } else if (pending) {
            const pendingBojId = String(pending.externalId || pending.problemId);
            const currentPid = String(problemId);

            if (pendingBojId === currentPid) {
                console.log(`[Debug] Cleaning up matching pending submission for problem ${problemId}`);
                chrome.storage.local.remove('pending_submission');
            }
        }

        // --- Send to Backend (Peekle) ---
        // Clean up memory/time strings (e.g. "123 KB" -> 123)
        const memoryInt = parseInt(String(memory).replace(/[^0-9]/g, '')) || 0;
        const timeInt = parseInt(String(time).replace(/[^0-9]/g, '')) || 0;

        // Language Normalization
        let normalizedLang = language.toLowerCase();
        if (normalizedLang.includes('python') || normalizedLang.includes('pypy')) {
            normalizedLang = 'python';
        } else if (normalizedLang.includes('java')) {
            normalizedLang = 'java';
        } else if (normalizedLang.includes('c++') || normalizedLang.includes('cpp')) {
            normalizedLang = 'C++';
        }
        // Add more if needed (e.g. javascript, kotlin...)

        const extensionToken = await getPeekleToken();

        if (!extensionToken || String(extensionToken).trim() === '') {
            if (sender?.tab) {
                chrome.tabs.sendMessage(sender.tab.id, {
                    type: 'SHOW_FEEDBACK',
                    payload: {
                        success: false,
                        message: "확장프로그램 토큰이 없습니다. Peekle에 로그인 후 다시 시도해주세요.",
                        delay: 0
                    }
                });
            }
            return; // ✅ 백엔드 요청 차단
        }

        const backendResponse = await sendToBackend({
            problemId: parseInt(problemId) || 0,
            problemTitle: problemInfo ? problemInfo.titleKo : "",
            problemTier: problemInfo ? String(problemInfo.level) : "0",
            language: normalizedLang, // Use normalized language
            code: code,
            memory: memoryInt,
            executionTime: timeInt,
            result: result,
            isSuccess: isSuccess,
            submittedAt: new Date().toISOString(),
            submitId: submitId,
            extensionToken,
            roomId: targetStudyId ? parseInt(targetStudyId) : null,
            sourceType: targetSourceType
        }, pending?.studyProblemId || null); // Pass studyProblemId if exists

        // Save to storage
        processed[submitId] = {
            problemId,
            timestamp: new Date().toISOString(),
            title: problemInfo ? problemInfo.titleKo : null,
            level: problemInfo ? problemInfo.level : null,
            memory,
            time,
            language,
            code: code
        };

        chrome.storage.local.set({ [PROCESSED_SUBMISSIONS_KEY]: processed }, () => {
            // Send Feedback to Content Script (Show Toast on Page)
            if (backendResponse) {
                // If it's a tab context, send to that tab
                if (sender && sender.tab) {
                    chrome.tabs.sendMessage(sender.tab.id, {
                        type: 'SHOW_FEEDBACK',
                        payload: backendResponse
                    });
                }
            } else {
                // Network error or backend down
                if (sender && sender.tab) {
                    chrome.tabs.sendMessage(sender.tab.id, {
                        type: 'SHOW_FEEDBACK',
                        payload: { success: false, message: "서버와 통신할 수 없습니다." }
                    });
                }
            }
        });

    });
}

// Cleanup pending submission if user navigates away from the problem page
function cleanupStalePendingSubmissions() {
    chrome.storage.local.get(['pending_submission'], (data) => {
        const pending = data.pending_submission;
        if (pending && pending.timestamp) {
            const fiveMinutes = 5 * 60 * 1000;
            if (Date.now() - pending.timestamp > fiveMinutes) {
                console.log('[Background] Clearing stale pending submission (older than 5 mins)');
                chrome.storage.local.remove('pending_submission');
            }
        }
    });
}

// Run cleanup periodically
setInterval(cleanupStalePendingSubmissions, 60000); // Every minute

// Cleanup pending submission if user navigates away from the problem page
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url) {
        chrome.storage.local.get(['pending_submission'], (data) => {
            const pending = data.pending_submission;
            if (pending) {
                // If it's a BOJ submission page but NOT for the pending problem, clear it
                // Pattern: https://www.acmicpc.net/submit/1234
                const bojSubmitMatch = changeInfo.url.match(/acmicpc\.net\/submit\/(\d+)/);

                if (bojSubmitMatch) {
                    const navigatedProblemId = bojSubmitMatch[1];
                    // Check externalId first (BOJ ID), then fallback to problemId (internal DB ID)
                    const pendingBojId = pending.externalId || pending.problemId;

                    if (String(navigatedProblemId) !== String(pendingBojId)) {
                        console.log(`User navigated to different problem ${navigatedProblemId} (Pending: ${pendingBojId}). Clearing pending study context.`);
                        chrome.storage.local.remove('pending_submission');
                    }
                }
            }
        });
    }
});

// --- Auto-Injection on Install ---
// 확장 프로그램 설치/업데이트 시 현재 열려 있는 탭(프론트엔드)에 content script 강제 주입
chrome.runtime.onInstalled.addListener(async () => {
    console.log('[Background] Extension Installed/Updated. Injecting content scripts...');

    // 타겟 URL 패턴 (프론트엔드 도메인)
    // manifest.json의 host_permissions에 해당 도메인이 있어야 함
    const targetPattern = IS_LOCAL ? 'http://localhost:3000/*' : 'https://i14a408.p.ssafy.io/*';

    try {
        // 프론트엔드 탭 찾기
        const tabs = await chrome.tabs.query({ url: targetPattern });

        for (const tab of tabs) {
            if (tab.id) {
                console.log(`[Background] Injecting script into tab ${tab.id} (${tab.url})`);
                try {
                    await chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        files: ['content.js']
                    });
                } catch (e) {
                    // 이미 주입되어 있거나 권한 문제 등 발생 시 무시
                    console.warn(`[Background] Failed to inject into tab ${tab.id}:`, e);
                }
            }
        }
    } catch (e) {
        console.error('[Background] Error during auto-injection:', e);
    }
});
