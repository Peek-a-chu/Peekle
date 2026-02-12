/**
 * Baekjoon Content Script
 * Detects correct submissions on the status page.
 */


console.log(`[Peekle Content] Script loaded on: ${window.location.href}`);

let observer = null;
const pendingSubmissions = new Set(); // Track IDs that are currently being judged
const sentSubmissions = new Set(); // Track IDs already sent to backend to prevent duplicates

// Theme color mapping (matches frontend theme colors)
const THEME_COLORS = {
    'blue': '#3B82F6',
    'skyblue': '#00B8D4',
    'orange': '#FF9500',
    'pink': '#E24EA0',
    'green': '#2E7D32',
    'lime': '#66BB6A'
};

function getThemeColor(accentColor, customColor) {
    if (accentColor === 'custom' && customColor) {
        return customColor;
    }
    return THEME_COLORS[accentColor] || THEME_COLORS['pink'];
}


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

        // Get the result color (more accurate than text parsing)
        const resultColor = resultCell.querySelector('.result-text')?.getAttribute('data-color');

        // 1. Check if it's a Pending Status using data-color
        // Pending states: 'wait', 'compile', 'judging'
        const isPending = ['wait', 'compile', 'judging'].includes(resultColor);

        if (isPending) {
            if (!pendingSubmissions.has(submitId)) {
                // console.log(`[Peekle] Now watching submission: ${submitId} (${resultColor})`);
                pendingSubmissions.add(submitId);
                showProcessingToast(submitId); // Show feedback
            }
            return; // It's still pending, nothing to do yet
        }

        // 2. It's not pending anymore. Check if it WAS pending.
        const wasPending = pendingSubmissions.has(submitId);

        // If it was watching, remove it from set (it's done now)
        if (wasPending) {
            pendingSubmissions.delete(submitId);
        }

        // 3. Filter: Only process finished states
        // [Fix] Removed strict filtering. If we were monitoring this (wasPending), we process it regardless of state name.
        // This ensures we catch 'ce' (Compile Error) or custom states.
        /*
        const finishedStates = ['ac', 'wa', 'rte', 'tle', 'mle', 'ole'];
        if (!finishedStates.includes(resultColor)) {
            // Unknown, partial state, or compile error - skip it
            return;
        }
        */

        // Additional Check: If text contains "%", it is likely still processing (e.g. "맞았습니다 (99%)")
        // Wait for final state without parens/percentage
        if (resultText.includes('%')) {
            // console.log(`[Peekle] Result contains %, waiting... (${resultText})`);
            return;
        }

        // 4. Determine success
        const isSuccess = resultColor === 'ac';

        // Only process submissions that we were actively monitoring
        if (wasPending) {

            // Mark as sent IMMEDIATELY to prevent dupes
            sentSubmissions.add(submitId);

            const problemId = problemCell.innerText;
            const memory = row.querySelector('td:nth-child(5)')?.innerText?.trim() || '0';
            const time = row.querySelector('td:nth-child(6)')?.innerText?.trim() || '0';
            const language = row.querySelector('td:nth-child(7)')?.innerText?.trim() || '-';

            // console.log(`[Peekle] Detected Result! ID: ${submitId}, Success: ${isSuccess}`);

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
                                isSuccess, // Add success flag
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
                                ...submissionData,
                                // If this is from a pending task, confirm context
                                studyId: task ? task.studyId : null,
                                sourceType: task ? task.sourceType : 'EXTENSION'
                            }
                        });
                    } catch (e) { }
                });
        }
    });
}

// Initial scan
scanForSuccess();

// BaekjoonHub style: Poll every 2 seconds instead of MutationObserver
let loader = null;
const username = getUsername();

if (username && window.location.href.includes('/status')) {
    loader = setInterval(() => {
        scanForSuccess();
    }, 2000);
    console.log('[Peekle] Started 2-second polling for submissions');
}


// --- Auto-Fill Submission Logic ---

async function checkForPendingSubmission() {
    // Only run on submission pages
    if (!window.location.href.includes('/submit/')) {
        console.log("Peekle: Not a submission page, skipping check.");
        return;
    }

    console.log("Peekle: Submission page detected. Checking for pending tasks...");

    // Safety check: if context is invalidated, stop
    if (!chrome || !chrome.storage || !chrome.storage.local) {
        console.error("Peekle: Chrome extension context missing/invalidated.");
        return;
    }

    // Get the problem ID from URL
    const urlMatches = window.location.href.match(/\/submit\/(\d+)/);
    if (!urlMatches) {
        console.log("Peekle: Could not extract problem ID from URL.");
        return;
    }
    const currentProblemId = urlMatches[1];
    console.log(`Peekle: Current problem ID is ${currentProblemId}`);

    try {
        // Check storage for pending tasks
        const data = await chrome.storage.local.get(['pending_submission']);
        const task = data.pending_submission;

        console.log("Peekle: Storage check result:", task);

        if (task) {
            console.log(`Peekle: Task found for problem ${task.problemId}. Current page is ${currentProblemId}.`);
            // Prioritize externalId (BOJ ID) for comparison, fallback to problemId
            const pendingBojId = task.externalId || task.problemId;

            if (String(pendingBojId) === String(currentProblemId)) {
                // Check if already consumed to prevent loop
                if (task.consumed) {
                    console.log("Peekle: Task already consumed. Skipping injection.");
                    return;
                }

                console.log("Peekle: Problem IDs match! Injecting script...");

                // Mark as consumed but KEEP in storage so SOLVED event can read studyId
                await chrome.storage.local.set({
                    'pending_submission': { ...task, consumed: true }
                });

                // Inject script to manipulate the page
                injectFillerScript(task.code, task.language);
            } else {
                console.log("Peekle: Problem IDs do NOT match. Skipping injection.");
            }
        } else {
            console.log("Peekle: No pending submission task found in storage.");
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

function showProcessingToast(submitId) {
    const toastId = `peekle-processing-${submitId}`;
    if (document.getElementById(toastId)) return; // Already showing

    const container = document.createElement('div');
    container.id = toastId;

    const procColor = '#3B82F6'; // Blue

    Object.assign(container.style, {
        position: 'fixed',
        top: '80px',
        right: '25px',
        width: '380px',
        background: 'white',
        color: '#171717',
        boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
        border: '1px solid #E4E4E7',
        zIndex: '2147483647',
        borderRadius: '16px',
        display: 'flex',
        alignItems: 'center',
        padding: '0',
        overflow: 'hidden',
        fontFamily: "'Pretendard', sans-serif",
        animation: 'peekleSlideIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards'
    });

    // SVG Spinner
    const spinnerSvg = `
        <svg class="peekle-spinner" width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <style>
                .peekle-spinner { animation: peekleSpin 1s linear infinite; }
                @keyframes peekleSpin { 100% { transform: rotate(360deg); } }
            </style>
            <circle cx="12" cy="12" r="10" stroke="#DBEAFE" stroke-width="3"/>
            <path d="M12 2C6.47715 2 2 6.47715 2 12" stroke="${procColor}" stroke-width="3" stroke-linecap="round"/>
        </svg>
    `;

    container.innerHTML = `
        <div style="position: absolute; top:0; left:0; width:100%; height:4px; background-color:${procColor};"></div>
        <div style="display:flex; align-items:center; gap:16px; padding:20px 24px;">
            <div style="width:40px; height:40px; display:flex; align-items:center; justify-content:center;">
                ${spinnerSvg}
            </div>
            <div style="display:flex; flex-direction:column; gap:2px;">
                <span style="font-size:16px; font-weight:800; color:${procColor}; font-style:italic;">Processing...</span>
                <span style="font-size:13px; color:#71717A; font-weight:600;">채점 진행 중입니다. 탭을 닫지 말아주세요!</span>
            </div>
        </div>
    `;

    // Inject Keyframes if needed
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
             @keyframes peekleSpin { 100% { transform: rotate(360deg); } }
        `;
        document.head.appendChild(styleSheet);
    }

    document.body.appendChild(container);
}

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

    // [Fix] Remove processing toast immediately (Cleanup for ALL feedback types)
    // This ensures loading screen disappears even for errors/failures
    if (data.submitId) {
        const procToast = document.getElementById(`peekle-processing-${data.submitId}`);
        if (procToast) procToast.remove();
    }

    // If it's a success, show the Premium Toast (The "Wow" factor)
    if (data.success) {
        showSuccessToast(data);
        return;
    }

    // If it's a failed submission (WA, RTE, TLE, etc.), show Failed Toast
    if (data.message && (data.message.includes('틀렸습니다') || data.message.includes('런타임') || data.message.includes('시간') || data.message.includes('메모리') || data.message.includes('출력'))) {
        showFailedToast(data);
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
        setTimeout(() => toast.remove(), 5000);
    }, 4000);
}

// Helper function to render status badge text
function renderStatusBadge(status) {
    if (!status) return '';

    const statusMap = {
        'PROMOTE': '승급예정',
        'STAY': '유지',
        'DEMOTE': '강등위기'
    };

    return statusMap[status] || '';
}

// Helper function to render point gap text
function renderPointGap(status, pointsToPromotion, pointsToMaintenance) {
    if (!status) return '';

    if (status === 'PROMOTE') {
        return ''; // 승급권은 표시 안함
    } else if (status === 'DEMOTE' && pointsToMaintenance != null && pointsToMaintenance > 0) {
        return `<br><span style="font-size: 9px; opacity: 0.8;">유지까지 ${pointsToMaintenance}점</span>`;
    } else if (status === 'STAY' && pointsToPromotion != null && pointsToPromotion > 0) {
        return `<br><span style="font-size: 9px; opacity: 0.8;">승급까지 ${pointsToPromotion}점</span>`;
    }
    return '';
}

async function showSuccessToast(data) {
    // Redundant cleanup removed (handled in showToast)

    const toastId = 'peekle-success-toast-' + Date.now();
    const container = document.createElement('div');
    container.id = toastId;

    // Get theme settings from storage
    let primaryColor = '#E24EA0'; // Default pink
    try {
        const result = await chrome.storage.local.get(['themeSettings']);
        if (result.themeSettings) {
            const { accentColor, customColor } = result.themeSettings;
            primaryColor = getThemeColor(accentColor, customColor);
        }
    } catch (e) {
        console.warn('[Peekle] Failed to load theme settings:', e);
    }

    // Define colors and styles
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

            .peekle-timer-badge {
                display: inline-flex;
                align-items: center;
                gap: 4px;
                background-color: #FFF1F2; /* Red-50 */
                color: #BE123C; /* Red-700 */
                padding: 4px 10px;
                border-radius: 999px;
                font-size: 11px;
                font-weight: 700;
                margin-top: 8px;
                align-self: flex-start;
                box-shadow: 0 1px 2px rgba(0,0,0,0.05);
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
                
                <div class="peekle-timer-badge">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    <span id="${toastId}-timer-text">계산 중...</span>
                </div>
            </div>
        </div>

        <div class="peekle-footer">
            <div class="peekle-footer-total">
                현재 총점: <span>${data.totalPoints || 0}점</span>
            </div>
            <div class="peekle-rank-badge">
                ${data.currentLeague || ''} ${renderStatusBadge(data.leagueStatus)} · 그룹 ${data.currentRank || '-'}위
                ${renderPointGap(data.leagueStatus, data.pointsToPromotion, data.pointsToMaintenance)}
            </div>
        </div>
    `;

    document.body.appendChild(container);

    // Logic: Confetti
    const confettiColors = [primaryColor, '#FFD700', '#00C2FF', '#FF4D4D', '#16A34A'];
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
    }, 2000);

    // Auto-Close Logic
    const autoCloseDelay = data.autoCloseDelay || 0;
    const willCloseTab = autoCloseDelay > 0;

    // If tab will close, use that delay. Else default to 6s for toast.
    // Note: Background delay is in ms (e.g., 3000). Convert to seconds.
    let initialSeconds = willCloseTab ? Math.ceil(autoCloseDelay / 1000) : 6;
    let timeLeft = initialSeconds;

    // Set close timeout
    // If tab closes (3s), this timeout acts as a fallback or sync. 
    // If only toast closes, it's 6s.
    const closeTimeoutDelay = willCloseTab ? autoCloseDelay + 500 : 6000;
    // +500ms safety buffer if tab is closing (let the tab close itself, or force remove toast just before)

    const closeTimer = setTimeout(closeToast, closeTimeoutDelay);

    // Timer Interval
    // Timer Interval
    const updateTimerText = () => {
        const timerTextEl = document.getElementById(`${toastId}-timer-text`);
        if (timerTextEl) {
            if (willCloseTab) {
                timerTextEl.innerText = `${timeLeft}초 후 탭이 닫힙니다`;
            } else {
                timerTextEl.innerText = `${timeLeft}초 후 알림이 닫힙니다`;
            }
        }
    };

    // Initial Update
    updateTimerText();

    const timerInterval = setInterval(() => {
        timeLeft--;
        updateTimerText();
        if (timeLeft <= 0) clearInterval(timerInterval);
    }, 1000);

    // Manual Close
    function closeToast() {
        clearInterval(timerInterval); // Clear interval
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

    // (Old footer injection logic removed)
}

function showFailedToast(data) {
    // Redundant cleanup removed (handled in showToast)

    const toastId = 'peekle-failed-toast-' + Date.now();
    const container = document.createElement('div');
    container.id = toastId;

    // Define colors
    const failColor = '#EF4444'; // Red-500

    // Inject styles if not present (reuse existing styles)
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
                box-shadow: 8px 8px 0px rgba(239,68,68,0.08), 0 5px 10px rgba(0,0,0,0.05);
                border: 1px solid #E4E4E7;
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

            .peekle-header-line {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 4px;
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
                font-style: italic;
                margin: 0;
                line-height: 1.2;
            }

            .peekle-close-btn {
                background: none;
                border: none;
                cursor: pointer;
                color: #D4D4D8;
                transition: color 0.2s, transform 0.2s;
                padding: 4px;
                position: absolute;
                top: 20px;
                right: 20px;
            }

            .peekle-footer {
                margin-top: 8px;
                padding: 16px 24px;
                border-top: 1px solid #F4F4F5;
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 12px;
                font-weight: 700;
            }

            .peekle-footer-total {
                color: #71717A;
            }
            .peekle-footer-total span {
                color: #000;
                font-weight: 900;
                margin-left: 4px;
            }

            .peekle-timer-badge {
                display: inline-flex;
                align-items: center;
                gap: 4px;
                background-color: #FFF1F2; /* Red-50 */
                color: #BE123C; /* Red-700 */
                padding: 4px 10px;
                border-radius: 999px;
                font-size: 11px;
                font-weight: 700;
                margin-top: 8px;
                align-self: flex-start;
                box-shadow: 0 1px 2px rgba(0,0,0,0.05);
            }

            .peekle-rank-badge {
                background-color: rgba(239, 68, 68, 0.05);
                padding: 2px 8px;
                border: 1px solid rgba(239, 68, 68, 0.1);
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
        <div class="peekle-header-line" style="background-color: ${failColor};"></div>
        
        <button class="peekle-close-btn" id="${toastId}-close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                <path d="M18 6L6 18M6 6l12 12" />
            </svg>
        </button>

        <div class="peekle-content">
            <div class="peekle-icon-box">
                <img src="${chrome.runtime.getURL('icons/wrong.svg')}" alt="Wrong" style="width: 100%; height: 100%; object-fit: contain;">
            </div>
            <div class="peekle-text-col">
                <h3 class="peekle-title" style="color: ${failColor} !important;">Try Again!</h3>
                <div style="margin-top: 4px;">
                    <span style="font-size:14px; color:#71717A; font-weight:600;">${data.message || '틀렸습니다'}</span>
                </div>
                
                <div class="peekle-timer-badge">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    <span id="${toastId}-timer-text">5초 후 닫힙니다</span>
                </div>
            </div>
        </div>

        <div class="peekle-footer">
            <div class="peekle-footer-total">
                현재 총점: <span>${data.totalPoints || 0}점</span>
            </div>
            <div class="peekle-rank-badge" style="color: ${failColor};">
                ${data.currentLeague || ''} ${renderStatusBadge(data.leagueStatus)} · 그룹 ${data.currentRank || '-'}위
                ${renderPointGap(data.leagueStatus, data.pointsToPromotion, data.pointsToMaintenance)}
            </div>
        </div>
    `;

    document.body.appendChild(container);

    // Auto-Close after 5s
    let timeLeft = 5;
    const closeTimer = setTimeout(closeToast, 5000);

    // Timer Interval
    // Timer Interval
    const updateTimer = () => {
        const timerEl = document.getElementById(`${toastId}-timer-text`);
        if (timerEl) {
            timerEl.innerText = `${timeLeft}초 후 닫힙니다`;
        }
    };

    const timerInterval = setInterval(() => {
        timeLeft--;
        updateTimer();
        if (timeLeft <= 0) clearInterval(timerInterval);
    }, 1000);

    // Manual Close
    function closeToast() {
        clearInterval(timerInterval);
        container.classList.add('exiting');
        setTimeout(() => {
            if (container && container.parentNode) {
                container.remove();
            }
        }, 600);
    }

    document.getElementById(`${toastId}-close`).onclick = () => {
        clearTimeout(closeTimer);
        closeToast();
    };

    // (Old footer injection logic removed)
}


// --- Extension Detection for Peekle Frontend ---
// Auto-notify frontend on load (for detecting fresh installations without refresh)
(async function autoNotifyFrontend() {
    // Only notify if we're on the frontend domain
    const isFrontend = window.location.hostname === 'localhost' || window.location.hostname.includes('i14a408.p.ssafy.io');
    if (!isFrontend) return;

    let token = null;
    try {
        const data = await chrome.storage.local.get(['peekle_token']);
        token = data.peekle_token || null;
    } catch (e) {
        // Context might be invalidated or error
    }

    // Auto-broadcast installation status
    window.postMessage({
        type: 'PEEKLE_EXTENSION_INSTALLED',
        version: chrome.runtime.getManifest().version,
        token: token
    }, '*');
    console.log('[Peekle Content Script] Auto-notifying frontend of installation. Token:', token ? 'YES' : 'NO');
})();

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
                const storageData = { 'peekle_token': token };
                // 사용자 정보도 같이 저장 (이미지 포함)
                if (event.data.user) {
                    storageData['userData'] = event.data.user;
                }
                await chrome.storage.local.set(storageData);
                console.log('[Peekle] Token and UserData saved:', token);
            } else {
                await chrome.storage.local.remove(['peekle_token', 'userData']);
                console.log('[Peekle] Token and UserData removed.');
            }
        } catch (e) {
            console.error('[Peekle] Failed to access storage:', e);
        }
    }

    // Handle Auto-Submission Request from Frontend
    if (event.data?.type === 'PEEKLE_SUBMIT_CODE') {
        console.log('[Peekle Content] Received PEEKLE_SUBMIT_CODE:', event.data);
        const { studyProblemId, externalId, code, language, sourceType } = event.data.payload;
        if (!externalId || !code) {
            console.error('[Peekle Content] Missing externalId or code');
            return;
        }

        console.log(`[Peekle] Processing auto-submit for BOJ: ${externalId} ${studyProblemId ? `(StudyProblem: ${studyProblemId})` : ''}`);

        // Send to background to save (bypasses direct storage permission issues on localhost)
        chrome.runtime.sendMessage({
            type: 'SAVE_PENDING_SUBMISSION',
            payload: { studyProblemId, externalId, code, language, sourceType: sourceType || 'EXTENSION' }
        }, (response) => {
            if (response && response.success) {
                console.log('[Peekle] Storage saved via background, background will open tab.');
            } else {
                console.error('[Peekle] Failed to save via background:', chrome.runtime.lastError);
            }
        });
    }
    // [New] Handle Theme Sync
    if (event.data?.type === 'PEEKLE_THEME_SYNC') {
        const { mode, accentColor, customColor } = event.data.payload;
        try {
            await chrome.storage.local.set({
                'themeSettings': { mode, accentColor, customColor }
            });
            // console.log('[Peekle] Theme settings saved:', { mode, accentColor });
        } catch (e) {
            console.error('[Peekle] Failed to save theme settings:', e);
        }
    }
    if (event.data?.type === 'PEEKLE_CLEAR_PENDING') {
        console.log('[Peekle Content] Received PEEKLE_CLEAR_PENDING. Notifying background.');
        chrome.runtime.sendMessage({ type: 'CLEAR_PENDING_SUBMISSION' });
    }
});
