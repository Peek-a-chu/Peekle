// --- Configuration ---
const IS_LOCAL = false; // false = 배포(Production), true = 로컬(Local)
// 통합된 Base URL (API & Frontend 모두 동일 도메인/포트 사용)
// Local: Next.js (3000)가 /api/* 요청을 Backend(8080)로 Proxy함 (next.config.ts rewrites 확인됨)
// Prod: Nginx가 요청을 분기함 (443 -> Frontend / Backend)
const BASE_URL = IS_LOCAL
    ? 'http://localhost:3000'
    : 'https://i14a408.p.ssafy.io';

const API_BASE_URL = BASE_URL; // Alias for compatibility
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
        console.log('Background: Saving pending submission and opening tab:', request.payload);
        chrome.storage.local.set({
            'pending_submission': {
                ...request.payload,
                timestamp: Date.now()
            }
        }, () => {
            // Open new tab
            const targetUrl = `https://www.acmicpc.net/submit/${request.payload.problemId}`;
            chrome.tabs.create({ url: targetUrl });
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



async function sendToBackend(data, studyId = null) {
    try {
        const url = studyId
            ? `${API_BASE_URL}/api/studies/${studyId}/submit`
            : `${API_BASE_URL}/api/submissions/`;

        console.log(`Sending submission to ${studyId ? 'Study' : 'General'} backend:`, data);

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
    const { submitId, problemId, result, username, memory, time, language, code } = payload;

    // Retrieve both processed history and pending context
    chrome.storage.local.get([PROCESSED_SUBMISSIONS_KEY, 'pending_submission'], async (items) => {
        const processed = items[PROCESSED_SUBMISSIONS_KEY] || {};
        const pending = items['pending_submission'];

        if (processed[submitId]) {
            console.log(`Submission ${submitId} already processed.`);
            return;
        }

        // New submission
        console.log(`New correct submission: ${problemId} by ${username}`);

        // Fetch problem details (tier, title)
        const problemInfo = await getProblemInfo(problemId);

        // --- Context Detection (Study vs. General) ---
        let targetStudyId = null;
        console.log('[Debug] Checking Context. Pending:', pending, 'Current Problem:', problemId);

        // If there's a pending task and the problemId matches, use that studyId
        if (pending) {
            const pendingPid = String(pending.problemId);
            const currentPid = String(problemId);

            console.log(`[Debug] Comparing IDs - Pending: ${pendingPid}, Current: ${currentPid}, Match: ${pendingPid === currentPid}`);

            if (pendingPid === currentPid) {
                targetStudyId = pending.studyId;
                console.log(`[Debug] Matching pending context found. Target Study ID: ${targetStudyId}`);
                // Clear pending task after matching
                chrome.storage.local.remove('pending_submission');
            } else {
                console.log(`[Debug] IDs do not match or pending is invalid.`);
            }
        } else {
            console.log(`[Debug] No pending submission found in storage.`);
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
            // result: result, // Backend assumes success for all received submissions
            submittedAt: new Date().toISOString(),
            submitId: submitId,
            extensionToken,
            roomId: targetStudyId ? parseInt(targetStudyId) : null,
            sourceType: targetStudyId ? "STUDY" : "EXTENSION"
        }, targetStudyId); // Pass studyId if exists

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
                    if (String(navigatedProblemId) !== String(pending.problemId)) {
                        console.log(`User navigated to different problem ${navigatedProblemId}. Clearing pending study context.`);
                        chrome.storage.local.remove('pending_submission');
                    }
                }
            }
        });
    }
});
