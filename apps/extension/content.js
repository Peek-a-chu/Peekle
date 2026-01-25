/**
 * Baekjoon Content Script
 * Detects correct submissions on the status page.
 */

let observer = null;
const pendingSubmissions = new Set(); // Track IDs that are currently being judged
const sentSubmissions = new Set(); // Track IDs already sent to backend to prevent duplicates

function getUsername() {
    // Try to find username in the top login bar
    const userEl = document.querySelector('.loginbar .username');
    return userEl ? userEl.innerText : null;
}

function scanForSuccess() {
    // Check context validity first
    if (!chrome.runtime?.id) {
        if (observer) observer.disconnect();
        return;
    }

    const username = getUsername();
    if (!username) return;

    const rows = document.querySelectorAll('#status-table tbody tr');
    rows.forEach(row => {
        // Typical Structure:
        // ID | User | Problem | Result | Memory | Time | Lang | len | Time
        const submitIdCell = row.querySelector('td:first-child');
        const userCell = row.querySelector('td:nth-child(2) a');
        const problemCell = row.querySelector('td:nth-child(3) a');
        const resultCell = row.querySelector('td.result');

        // Basic validation
        if (!userCell || !resultCell || !problemCell || !submitIdCell) return;

        // Only process my own submissions
        if (userCell.innerText !== username) return;

        const resultText = resultCell.innerText.trim();
        const submitId = submitIdCell.innerText;

        // Skip if already sent in this session
        if (sentSubmissions.has(submitId)) return;

        // 1. Check if it's a Pending Status (Judging, Waiting, etc.)
        // "채점 준비중", "채점 중 (1%)", "재채점 대기 중" etc.
        const isPending = resultText.includes('채점') || resultText.includes('%') || resultText.includes('대기');

        if (isPending) {
            if (!pendingSubmissions.has(submitId)) {
                // console.log(`[Peekle] Now watching submission: ${submitId} (${resultText})`);
                pendingSubmissions.add(submitId);
            }
            return; // It's still pending, nothing to do yet
        }

        // 2. It's not pending anymore. Check if it WAS pending or is RECENT.
        const wasPending = pendingSubmissions.has(submitId);

        // Time Check check as a fallback (for refresh case)
        const submitTimeText = row.querySelector('td:nth-child(9)')?.innerText?.trim() || '';
        const isRecent = submitTimeText.includes('초 전') ||
            submitTimeText.includes('분 전') ||
            submitTimeText.includes('시간 전');

        // If it was watching, remove it from set (it's done now)
        if (wasPending) {
            pendingSubmissions.delete(submitId);
        }

        // 3. Process Success
        // 결과 텍스트가 "맞았습니다" 혹은 "100점" 혹은 숫자 100점인 경우
        if (resultText.includes('맞았습니다') || resultText.includes('100점') || (resultText.includes('점') && !resultText.includes('%') && parseInt(resultText) === 100)) {
            // Process if we were watching it OR if it looks recent
            if (wasPending || isRecent) {

                // Mark as sent IMMEDIATELY to prevent dupes
                sentSubmissions.add(submitId);

                const problemId = problemCell.innerText;
                const memory = row.querySelector('td:nth-child(5)')?.innerText?.trim() || '0';
                const time = row.querySelector('td:nth-child(6)')?.innerText?.trim() || '0';
                const language = row.querySelector('td:nth-child(7)')?.innerText?.trim() || '-';

                // console.log(`[Peekle] Detected Success! ID: ${submitId}, Watcher: ${wasPending}, Recent: ${isRecent}`);

                // Fetch source code directly from content script (same origin, valid session)
                fetch(`https://www.acmicpc.net/source/${submitId}`)
                    .then(res => res.text())
                    .then(html => {
                        const doc = new DOMParser().parseFromString(html, 'text/html');
                        // Code is usually in a textarea with name="source"
                        const codeElement = doc.querySelector('textarea[name="source"]');
                        const code = codeElement ? codeElement.value : null;

                        // Send to background safely
                        try {
                            chrome.runtime.sendMessage({
                                type: 'SOLVED',
                                payload: {
                                    problemId,
                                    submitId,
                                    username,
                                    timestamp: new Date().toISOString(),
                                    result: resultText,
                                    memory,
                                    time,
                                    language,
                                    code
                                }
                            });
                        } catch (e) {
                            if (observer) observer.disconnect();
                        }
                    })
                    .catch(err => {
                        // console.error('Failed to fetch source code:', err);
                        // Send without code if fetch fails
                        try {
                            chrome.runtime.sendMessage({
                                type: 'SOLVED',
                                payload: {
                                    problemId,
                                    submitId, username, timestamp: new Date().toISOString(), result: resultText, memory, time, language,
                                    code: null
                                }
                            });
                        } catch (e) { }
                    });
            }
        }
    });
}

// Initial scan
scanForSuccess();

// Observe for dynamic updates in the table
const statusTable = document.getElementById('status-table');
if (statusTable) {
    observer = new MutationObserver(() => {
        scanForSuccess();
    });
    observer.observe(statusTable, { childList: true, subtree: true });
}

// --- Auto-Fill Submission Logic ---

async function checkForPendingSubmission() {
    // Only run on submission pages
    if (!window.location.href.includes('/submit/')) return;

    // Safety check: if context is invalidated, stop
    if (!chrome || !chrome.storage || !chrome.storage.local) return;

    // Get the problem ID from URL
    const urlMatches = window.location.href.match(/\/submit\/(\d+)/);
    if (!urlMatches) return;
    const currentProblemId = urlMatches[1];

    try {
        // Check storage for pending tasks
        const data = await chrome.storage.local.get(['pending_submission']);
        const task = data.pending_submission;

        console.log("Peekle: Storage check result:", task);

        if (task && task.problemId === currentProblemId) {
            console.log("Peekle: Found pending task, injecting...");
            // Clear the task so it doesn't run again on reload
            // await chrome.storage.local.remove('pending_submission');

            // Do NOT remove the task immediately. 
            // We need to keep 'studyId' in pending_submission so that:
            // 1. Typically the popup shows the correct status (Study Mode)
            // 2. The background script knows where to send the submission (Study API)

            // Inject script to manipulate the page
            injectFillerScript(task.code, task.language);
        }
    } catch (e) {
        console.warn("Peekle: Context invalidated during storage access", e);
    }
}

function injectFillerScript(code, language) {
    console.log("Peekle: Injecting external script for auto-fill...");

    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('inject_script.js');

    // Pass data via dataset (URI encoded)
    script.dataset.language = language;
    script.dataset.code = encodeURIComponent(code);

    script.onload = function () {
        console.log("Peekle: Script injected and loaded.");
        this.remove();
    };

    (document.head || document.documentElement).appendChild(script);
}

// Run the check
checkForPendingSubmission();

// --- Feedback Toast Logic ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'SHOW_FEEDBACK') {
        const payload = request.payload;
        if (payload.delay && payload.delay > 0) {
            setTimeout(() => {
                showToast(payload);
            }, payload.delay);
        } else {
            showToast(payload);
        }
        // Send response to acknowledge (helps with window.close in popup)
        sendResponse({ received: true });
    }
});

function showToast(data) {
    // data structure: { success, isFirstSolve, earnedPoints, totalPoints, currentRank, message }

    // If it's a success, show the Premium Toast (The "Wow" factor)
    if (data.success) {
        showSuccessToast(data);
        return;
    }

    // Fallback for Errors / Others (Simple Toast)
    const toastId = 'peekle-toast-' + Date.now();
    const toast = document.createElement('div');
    toast.id = toastId;

    let bgColor = '#e74c3c'; // Red (Error)
    let icon = '🚨';

    // If successful but not first solve (duplicate), it might fall here if we treat "success" specifically as "points gained"
    // But typically data.success is true even for duplicates in this logic, 
    // unless the user wants ONLY high-fanfare for points.
    // However, the user said "success", so we handled all success in showSuccessToast.
    // If for some reason we end up here:
    if (!data.success) {
        // Validation errors, server errors
        bgColor = '#e74c3c';
        icon = '🚨';
    }

    Object.assign(toast.style, {
        position: 'fixed',
        top: '80px',
        right: '25px',
        backgroundColor: bgColor,
        color: 'white',
        padding: '16px 24px',
        borderRadius: '12px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
        zIndex: '2147483647',
        fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif",
        fontSize: '14px',
        fontWeight: '500',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        animation: 'peekleSlideIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.1)'
    });

    toast.innerHTML = `<span style="font-size: 18px;">${icon}</span> <span>${data.message}</span>`;

    // Inject keyframes if not present
    if (!document.getElementById('peekle-keyframes')) {
        const styleSheet = document.createElement("style");
        styleSheet.id = 'peekle-keyframes';
        styleSheet.innerText = `
            @keyframes peekleSlideIn {
                from { transform: translateX(120%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes peekleSlideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(120%); opacity: 0; }
            }
            @font-face {
                font-family: 'Pretendard';
                src: url('https://cdn.jsdelivr.net/gh/Project-Noonnu/noonfonts_2107@1.1/Pretendard-Regular.woff') format('woff');
                font-weight: 400;
                font-style: normal;
            }
        `;
        document.head.appendChild(styleSheet);
    }

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'peekleSlideOut 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards';
        setTimeout(() => toast.remove(), 50000);
    }, 40000);
}

function showSuccessToast(data) {
    const toastId = 'peekle-success-toast-' + Date.now();
    const container = document.createElement('div');
    container.id = toastId;

    // Define colors and styles
    const primaryColor = '#E24EA0';
    const secondaryColor = '#FFF0F7'; // Light pink background for icon

    // Inject distinct styles for this toast
    const styleId = 'peekle-toast-styles';
    if (!document.getElementById(styleId)) {
        const css = `
            .peekle-toast-container {
                position: fixed;
                top: 80px;
                right: 25px;
                width: 380px;
                background: white;
                color: #171717;
                box-shadow: 8px 8px 0px rgba(226,78,160,0.08), 0 5px 10px rgba(0,0,0,0.05);
                border: 1px solid #E4E4E7; /* zinc-200 */
                z-index: 2147483647;
                font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif;
                overflow: hidden;
                pointer-events: auto;
                animation: peekleSlideIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }
            
            .peekle-toast-container.exiting {
                animation: peekleSlideOut 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }

            @keyframes peekleSlideIn {
                from { transform: translateX(120%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes peekleSlideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(120%); opacity: 0; }
            }

            .peekle-confetti {
                position: absolute;
                width: 6px;
                height: 6px;
                opacity: 0;
                pointer-events: none;
                animation: peekleFall 1.5s ease-out forwards;
                /* Default drift if not set */
                --fall-drift: 0px; 
            }

            @keyframes peekleFall {
                0% { transform: translate(0, 0) rotate(0deg); opacity: 1; }
                100% { transform: translate(var(--fall-drift), 180px) rotate(360deg); opacity: 0; }
            }

            .peekle-header-line {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 4px;
                background-color: ${primaryColor};
            }

            .peekle-content {
                display: flex;
                align-items: center;
                gap: 6px;
                position: relative;
                z-index: 10;
                padding: 12px 24px 0 24px;
            }

            .peekle-icon-box {
                flex-shrink: 0;
                width: 80px;
                height: 80px;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .peekle-text-col {
                display: flex;
                flex-direction: column;
                flex: 1;
            }

            .peekle-title {
                font-size: 18px;
                font-weight: 900;
                letter-spacing: -0.05em;
                color: ${primaryColor} !important;
                font-style: italic;
                margin: 0;
                line-height: 1.2;
            }

            .peekle-score-row {
                display: flex;
                align-items: baseline;
                gap: 6px;
                margin-top: 2px;
            }

            .peekle-points {
                font-size: 32px;
                font-weight: 900;
                letter-spacing: -0.05em;
                line-height: 1;
                color: #000;
                font-variant-numeric: tabular-nums;
            }

            .peekle-points-label {
                font-size: 12px;
                font-weight: 700;
                color: #A1A1AA; /* zinc-400 */
                text-transform: uppercase;
                letter-spacing: -0.05em;
            }

            .peekle-close-btn {
                background: none;
                border: none;
                cursor: pointer;
                color: #D4D4D8; /* zinc-300 */
                transition: color 0.2s, transform 0.2s;
                padding: 4px;
                position: absolute;
                top: 20px;
                right: 20px;
            }
            .peekle-close-btn:hover {
                color: ${primaryColor};
                transform: scale(1.1);
            }

            .peekle-footer {
                margin-top: 8px;
                padding: 16px 24px;
                border-top: 1px solid #F4F4F5; /* zinc-100 */
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 12px;
                font-weight: 700;
            }

            .peekle-footer-total {
                color: #71717A; /* zinc-500 */
            }
            .peekle-footer-total span {
                color: #000;
                font-weight: 900;
                margin-left: 4px;
            }

            .peekle-rank-badge {
                background-color: rgba(226, 78, 160, 0.05);
                color: ${primaryColor};
                padding: 2px 8px;
                border: 1px solid rgba(226, 78, 160, 0.1);
                border-radius: 10px !important;
                font-size: 11px;
            }
        `;
        const s = document.createElement('style');
        s.id = styleId;
        s.textContent = css;
        document.head.appendChild(s);
    }

    container.className = 'peekle-toast-container';

    // HTML Structure
    container.innerHTML = `
        <div class="peekle-header-line"></div>
        <div id="${toastId}-confetti" style="position:absolute; inset:0; pointer-events:none; z-index:20;"></div>
        
        <button class="peekle-close-btn" id="${toastId}-close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                <path d="M18 6L6 18M6 6l12 12" />
            </svg>
        </button>

        <div class="peekle-content">
            <div class="peekle-icon-box">
                <img src="${chrome.runtime.getURL('icons/cute.svg')}" alt="Character" style="width: 100%; height: 100%; object-fit: contain;">
            </div>
            <div class="peekle-text-col">
                <h3 class="peekle-title">Problem Solved!</h3>
                <div class="peekle-score-row">
                    ${(data.firstSolve || data.isFirstSolve)
            ? `<span class="peekle-points">+${data.earnedPoints || 0}</span> <span class="peekle-points-label">Points</span>`
            : `<span style="font-size:12px; color:#A1A1AA; font-weight:700;">이미 푼 문제입니다</span>`
        }
                </div>
            </div>
        </div>

        <div class="peekle-footer">
            <div class="peekle-footer-total">
                현재 총점: <span>${data.totalPoints || 0}점</span>
            </div>
            <div class="peekle-rank-badge">
                ${data.currentLeague || ''} · 그룹 ${data.currentRank || '-'}위
            </div>
        </div>
    `;

    document.body.appendChild(container);

    // Logic: Confetti
    const confettiColors = ['#E24EA0', '#FFD700', '#00C2FF', '#FF4D4D', '#16A34A'];
    const confettiContainer = document.getElementById(`${toastId}-confetti`);

    // Spawn particles
    for (let i = 0; i < 25; i++) {
        const p = document.createElement('div');
        p.className = 'peekle-confetti';
        p.style.backgroundColor = confettiColors[i % confettiColors.length];

        // Random Position
        p.style.left = (Math.random() * 100) + '%';
        p.style.top = '-10%';

        // Animation Param: Random Delay
        p.style.animationDelay = (Math.random() * 0.4) + 's';

        // Animation Param: Random Drift (wind effect) -30px to +30px
        const drift = (Math.random() * 60 - 30) + 'px';
        p.style.setProperty('--fall-drift', drift);

        confettiContainer.appendChild(p);
    }

    // Stop confetti after 2s (remove node to cleanup)
    setTimeout(() => {
        if (confettiContainer) confettiContainer.remove();
    }, 200000);

    // Auto-Close after 6s (bit longer to admire)
    const closeTimer = setTimeout(closeToast, 60000);

    // Manual Close
    function closeToast() {
        container.classList.add('exiting');
        setTimeout(() => {
            if (container && container.parentNode) {
                container.remove();
            }
        }, 6000); // match animation duration
    }

    document.getElementById(`${toastId}-close`).onclick = () => {
        clearTimeout(closeTimer);
        closeToast();
    };
}

// --- Extension Detection for Peekle Frontend ---
window.addEventListener('message', async (event) => {
    // We only accept messages from ourselves
    if (event.source !== window) return;

    if (event.data?.type === 'PEEKLE_CHECK_EXTENSION') {
        let token = null;
        try {
            const data = await chrome.storage.local.get(['peekle_token']);
            token = data.peekle_token || null;
        } catch (e) {
            // Context might be invalidated or error
        }

        // Reply to the web page saying "I am here!" with the token
        window.postMessage({
            type: 'PEEKLE_EXTENSION_INSTALLED',
            version: chrome.runtime.getManifest().version,
            token: token
        }, '*');
        // console.log('[Peekle Content Script] Responded to check via window message. Token:', token ? 'YES' : 'NO');
    }

    // Handle Setting Token
    if (event.data?.type === 'PEEKLE_SET_TOKEN') {
        const token = event.data.token;
        try {
            if (token) {
                await chrome.storage.local.set({ 'peekle_token': token });
                console.log('[Peekle] Token saved:', token);
            } else {
                await chrome.storage.local.remove('peekle_token');
                console.log('[Peekle] Token removed.');
            }
        } catch (e) {
            console.error('[Peekle] Failed to access storage:', e);
        }
    }

    // Handle Auto-Submission Request from Frontend
    if (event.data?.type === 'PEEKLE_SUBMIT_CODE') {
        console.log('[Peekle Content] Received PEEKLE_SUBMIT_CODE:', event.data);
        const { problemId, code, language, studyId } = event.data.payload;
        if (!problemId || !code) {
            console.error('[Peekle Content] Missing problemId or code');
            return;
        }

        console.log(`[Peekle] Processing auto-submit for problem: ${problemId} ${studyId ? `(Study: ${studyId})` : ''}`);

        // Send to background to save (bypasses direct storage permission issues on localhost)
        chrome.runtime.sendMessage({
            type: 'SAVE_PENDING_SUBMISSION',
            payload: { problemId, code, language, studyId }
        }, (response) => {
            if (response && response.success) {
                console.log('[Peekle] Storage saved via background, background will open tab.');
            } else {
                console.error('[Peekle] Failed to save via background:', chrome.runtime.lastError);
            }
        });
    }
});
