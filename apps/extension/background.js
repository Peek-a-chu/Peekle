// --- Baekjoon Solver Logic ---

const PROCESSED_SUBMISSIONS_KEY = 'processed_submissions';
const PEEKLE_TOKEN_KEY = 'peekle_token';

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'SOLVED') {
        handleSolvedSubmission(request.payload, sender);
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



async function sendToBackend(data) {
    try {
        console.log('Sending submission to backend:', data);
        const response = await fetch('http://localhost:8080/api/submissions/', {
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

    // Check storage for duplicates
    chrome.storage.local.get([PROCESSED_SUBMISSIONS_KEY], async (items) => {
        const processed = items[PROCESSED_SUBMISSIONS_KEY] || {};

        if (processed[submitId]) {
            console.log(`Submission ${submitId} already processed.`);
            return;
        }

        // New submission
        console.log(`New correct submission: ${problemId} by ${username}`);

        // Fetch problem details (tier, title)
        const problemInfo = await getProblemInfo(problemId);

        // --- Send to Backend (Peekle) ---
        // Clean up memory/time strings (e.g. "123 KB" -> 123)
        const memoryInt = parseInt(String(memory).replace(/[^0-9]/g, '')) || 0;
        const timeInt = parseInt(String(time).replace(/[^0-9]/g, '')) || 0;

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
            language: language,
            code: code,
            memory: memoryInt,
            executionTime: timeInt,
            // result: result, // Backend assumes success for all received submissions
            submittedAt: new Date().toISOString(),
            submitId: submitId,
            extensionToken
        });

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
