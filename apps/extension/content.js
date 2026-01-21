/**
 * Baekjoon Content Script
 * Detects correct submissions on the status page.
 */

let observer = null;
const pendingSubmissions = new Set(); // Track IDs that are currently being judged

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
        const userCell = row.querySelector('td:nth-child(2) a');
        const problemCell = row.querySelector('td:nth-child(3) a');
        const resultCell = row.querySelector('td.result');
        const submitIdCell = row.querySelector('td:first-child');

        // Basic validation
        if (!userCell || !resultCell || !problemCell || !submitIdCell) return;

        // Only process my own submissions
        if (userCell.innerText !== username) return;

        const resultText = resultCell.innerText.trim();
        const submitId = submitIdCell.innerText;

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
        if (resultText.includes('맞았습니다')) {
            // Process if we were watching it OR if it looks recent
            if (wasPending || isRecent) {
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

        if (task && task.problemId === currentProblemId) {
            // Clear the task so it doesn't run again on reload
            await chrome.storage.local.remove('pending_submission');

            // Inject script to manipulate the page
            injectFillerScript(task.code, task.language);
        }
    } catch (e) {
        console.warn("Peekle: Context invalidated during storage access", e);
    }
}

function injectFillerScript(code, language) {
    const script = document.createElement('script');
    script.textContent = `
    (function() {
        console.log("Peekle: Auto-filling submission...");
        
        const targetLang = ${JSON.stringify(language)};
        const targetCode = ${JSON.stringify(code)};

        function attemptFill(retries) {
            if (retries <= 0) {
                console.error("Peekle: Failed to find editor elements.");
                return;
            }

            // 1. Find CodeMirror instance
            const cmEl = document.querySelector('.CodeMirror');
            const cm = cmEl ? cmEl.CodeMirror : null;
            
            // 2. Find Language Select
            // Baekjoon uses Chosen.js, so the select might be hidden (#language)
            // or we might need to interact with the chosen container (#language_chosen)
            const langSelect = document.getElementById('language');

            if (!cm || !langSelect) {
                setTimeout(() => attemptFill(retries - 1), 500);
                return;
            }

            // --- Set Language ---
            let langVal = null;
            // Iterate options to find matching text (e.g. "Java 11")
            for(let opt of langSelect.options) {
                if (opt.text.trim().includes(targetLang) || opt.text.trim() === targetLang) {
                    langVal = opt.value;
                    break;
                }
            }

            if (langVal) {
                langSelect.value = langVal;
                
                // Dispatch classic events
                langSelect.dispatchEvent(new Event('change'));
                
                // Trigger Chosen.js update if available (jQuery is usually present on BOJ)
                if (window.jQuery) {
                    window.jQuery('#language').trigger('chosen:updated');
                    window.jQuery('#language').trigger('change');
                }
            } else {
                console.warn("Peekle: Language not found - " + targetLang);
            }

            // --- Set Code ---
            cm.setValue(targetCode);
            console.log("Peekle: Code filled.");
        }

        // Start attempting
        attemptFill(10);
    })();
    `;
    document.body.appendChild(script);
    script.remove();
}

// Run the check
checkForPendingSubmission();
