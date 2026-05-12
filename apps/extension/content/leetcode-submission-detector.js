(function () {
    const LEETCODE_HOSTS = new Set(['leetcode.com', 'www.leetcode.com']);
    if (!LEETCODE_HOSTS.has(window.location.hostname)) return;

    const PANEL_ID = 'peekle-leetcode-submission-panel';
    const STYLE_ID = 'peekle-leetcode-submission-style';
    const PROBLEM_CONTEXT_KEY = 'peekle_leetcode_problem_context_v1';
    const SUBMISSION_URL_PATTERN = /\/problems\/([^/]+)\/submissions\/(\d+)\/?/;
    const PROBLEM_URL_PATTERN = /\/problems\/([^/]+)(?:\/description)?\/?/;

    let lastRenderedSubmissionKey = null;
    const sentSubmissionKeys = new Set();
    let scanTimer = null;

    function parseSubmissionUrl(url = window.location.href) {
        const match = url.match(SUBMISSION_URL_PATTERN);
        if (!match) return null;

        return {
            slug: match[1],
            submissionId: match[2],
            url
        };
    }

    function parseProblemSlug(url = window.location.href) {
        const match = url.match(PROBLEM_URL_PATTERN);
        return match?.[1] || null;
    }

    function normalizeText(value) {
        return String(value || '').replace(/\s+/g, ' ').trim();
    }

    function readVisibleText() {
        return document.body?.innerText || '';
    }

    function getKstIsoString(date = new Date()) {
        const parts = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Seoul',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        }).formatToParts(date).reduce((acc, part) => {
            acc[part.type] = part.value;
            return acc;
        }, {});

        return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`;
    }

    function getSubmissionDetailText(text = readVisibleText()) {
        const startMarkers = ['\nAll Submissions', '\n전체 제출 내역'];
        let startIndex = startMarkers
            .map((marker) => text.indexOf(marker))
            .filter((index) => index >= 0)
            .sort((a, b) => a - b)[0];

        if (startIndex === undefined) {
            const fallbackMarkers = ['testcases passed', '테스트케이스 통과'];
            startIndex = fallbackMarkers
                .map((marker) => text.indexOf(marker))
                .filter((index) => index >= 0)
                .sort((a, b) => a - b)[0];
        }

        if (startIndex === undefined) return '';

        const section = text.slice(Math.max(0, startIndex));
        const endMarkers = ['\nView more', '\nMore challenges', '\nWrite your notes here', '\n더 보기'];
        const endIndex = endMarkers
            .map((marker) => section.indexOf(marker))
            .filter((index) => index > 0)
            .sort((a, b) => a - b)[0];

        return (endIndex ? section.slice(0, endIndex) : section).trim();
    }

    function findProblemTitle(slug) {
        const candidates = [
            '[data-cy="question-title"]',
            'a[href="/problems/' + slug + '/"]',
            'a[href="/problems/' + slug + '/description/"]',
            'h1'
        ];

        for (const selector of candidates) {
            const elements = Array.from(document.querySelectorAll(selector));
            for (const element of elements) {
                const text = normalizeText(element.innerText || element.textContent);
                if (/^\d+\.\s+/.test(text) || text.toLowerCase().includes(slug.replace(/-/g, ' '))) {
                    return text;
                }
            }
        }

        const title = document.title?.replace(/\s*-\s*LeetCode\s*$/i, '').trim();
        return title || '';
    }

    function extractProblemTags() {
        const tagLinks = Array.from(document.querySelectorAll('a[href^="/tag/"], a[href*="leetcode.com/tag/"]'));
        const seen = new Set();

        return tagLinks
            .map((link) => {
                const href = link.getAttribute('href') || '';
                const key = href.match(/\/tag\/([^/?#]+)/)?.[1] || '';
                const name = normalizeText(link.innerText || link.textContent) || key;

                return {
                    key,
                    name
                };
            })
            .filter((tag) => tag.key)
            .filter((tag) => {
                if (seen.has(tag.key)) return false;
                seen.add(tag.key);
                return true;
            });
    }

    function findDifficulty() {
        const lines = readVisibleText()
            .split('\n')
            .map(normalizeText)
            .filter(Boolean);

        return lines.find((line) => /^(Easy|Medium|Hard)$/.test(line)) || '';
    }

    function cacheProblemContext() {
        const submissionInfo = parseSubmissionUrl();
        if (submissionInfo) return;

        const slug = parseProblemSlug();
        if (!slug) return;

        const rawTitle = findProblemTitle(slug);
        const problemNumberMatch = rawTitle.match(/^(\d+)\.\s*(.+)$/);
        const context = {
            source: 'leetcode',
            slug,
            titleSlug: slug,
            problemNumber: problemNumberMatch ? problemNumberMatch[1] : '',
            title: problemNumberMatch ? problemNumberMatch[2] : rawTitle,
            difficulty: findDifficulty(),
            tags: extractProblemTags(),
            problemUrl: 'https://leetcode.com/problems/' + slug + '/description/',
            capturedAt: new Date().toISOString()
        };

        try {
            sessionStorage.setItem(PROBLEM_CONTEXT_KEY + ':' + slug, JSON.stringify(context));
        } catch (error) {
            console.warn('[Peekle LeetCode] Failed to cache problem context.', error);
        }
    }

    function readCachedProblemContext(slug) {
        try {
            const raw = sessionStorage.getItem(PROBLEM_CONTEXT_KEY + ':' + slug);
            return raw ? JSON.parse(raw) : null;
        } catch (error) {
            return null;
        }
    }

    function detectResult(text) {
        const normalized = normalizeText(text);
        const resultCandidates = [
            ['Accepted', '통과'],
            ['Wrong Answer', '오답'],
            ['Compile Error', '컴파일 에러'],
            ['Runtime Error', '런타임 에러'],
            ['Time Limit Exceeded', '시간 초과'],
            ['Memory Limit Exceeded', '메모리 초과'],
            ['Output Limit Exceeded', '출력 초과']
        ];

        for (const [english, korean] of resultCandidates) {
            if (normalized.includes(english) || normalized.includes(korean)) {
                return english;
            }
        }

        return '';
    }

    function parseNumberAfterLabel(text, labels, unitPattern) {
        for (const label of labels) {
            const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(escapedLabel + '\\s*\\n?\\s*([0-9]+(?:\\.[0-9]+)?)\\s*\\n?\\s*' + unitPattern, 'i');
            const match = text.match(regex);
            if (match) return match[1];
        }

        return '';
    }

    function parseLeetcodeSubmittedAt(text) {
        const patterns = [
            /submitted at\s+([^\n]+)/i,
            /제출 시간\s+([^\n]+)/i
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) return normalizeText(match[1]);
        }

        return '';
    }

    function parseLanguage(text) {
        const patterns = [
            /(?:^|\n)Code\s*\n\s*([A-Za-z0-9+#. -]{1,40})(?:\n|$)/i,
            /(?:^|\n)코드\s*\n\s*([A-Za-z0-9+#. -]{1,40})(?:\n|$)/i
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) return normalizeText(match[1]);
        }

        return '';
    }

    function parseCodeFromDom() {
        const codeCandidates = Array.from(document.querySelectorAll('pre, code, [role="code"]'))
            .map((element) => ({
                text: (element.innerText || element.textContent || '').trim(),
                element
            }))
            .filter((candidate) => candidate.text.length > 20)
            .filter((candidate) => /class\s+Solution|def\s+\w+|function\s+\w+|#include|public\s+class|impl\s+Solution/.test(candidate.text));

        if (codeCandidates.length > 0) {
            return codeCandidates[codeCandidates.length - 1].text;
        }

        const text = getSubmissionDetailText();
        const codeStart = Math.max(text.indexOf('\nCode\n'), text.indexOf('\n코드\n'));
        if (codeStart < 0) return '';

        const codeSection = text.slice(codeStart);
        return codeSection.trim();
    }

    function extractSubmissionData(submissionInfo) {
        const text = getSubmissionDetailText();
        const hasSubmissionDetail =
            text.includes('All Submissions') ||
            text.includes('전체 제출 내역') ||
            text.includes('testcases passed') ||
            text.includes('테스트케이스 통과');

        if (!hasSubmissionDetail) return null;

        const result = detectResult(text);
        if (!result) return null;

        const cachedContext = readCachedProblemContext(submissionInfo.slug) || {};
        const rawTitle = cachedContext.title || findProblemTitle(submissionInfo.slug);
        const problemNumberMatch = rawTitle.match(/^(\d+)\.\s*(.+)$/);
        const problemNumber = cachedContext.problemNumber || (problemNumberMatch ? problemNumberMatch[1] : '');
        const title = cachedContext.title || (problemNumberMatch ? problemNumberMatch[2] : rawTitle);
        const displayTitle = problemNumber && title ? `${problemNumber}. ${title}` : title;
        const runtime = parseNumberAfterLabel(text, ['Runtime', '실행 시간'], 'ms');
        const memory = parseNumberAfterLabel(text, ['Memory', '메모리'], 'MB');
        const tags = Array.isArray(cachedContext.tags) ? cachedContext.tags : extractProblemTags();
        const difficulty = cachedContext.difficulty || findDifficulty();

        return {
            source: 'leetcode',
            submitId: submissionInfo.submissionId,
            result,
            isSuccess: result === 'Accepted',
            externalId: problemNumber || submissionInfo.slug,
            problemNumber,
            title,
            displayTitle,
            difficulty,
            tags,
            tagKeys: tags.map((tag) => tag.key),
            slug: submissionInfo.slug,
            titleSlug: submissionInfo.slug,
            problemUrl: cachedContext.problemUrl || 'https://leetcode.com/problems/' + submissionInfo.slug + '/description/',
            language: parseLanguage(text),
            runtimeMs: runtime,
            memoryMb: memory,
            submittedAt: getKstIsoString(),
            leetcodeSubmittedAt: parseLeetcodeSubmittedAt(text),
            code: parseCodeFromDom(),
            detectedAt: new Date().toISOString()
        };
    }

    function ensureStyle() {
        if (document.getElementById(STYLE_ID)) return;

        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
            #${PANEL_ID} {
                position: fixed;
                right: 18px;
                bottom: 18px;
                width: min(460px, calc(100vw - 36px));
                max-height: min(680px, calc(100vh - 36px));
                overflow: auto;
                z-index: 2147483647;
                box-sizing: border-box;
                border: 1px solid rgba(226, 78, 160, 0.32);
                border-radius: 8px;
                background: #ffffff;
                color: #111827;
                box-shadow: 0 18px 50px rgba(17, 24, 39, 0.22);
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                font-size: 13px;
                line-height: 1.45;
            }
            #${PANEL_ID} * {
                box-sizing: border-box;
            }
            #${PANEL_ID} .peekle-lc-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 12px;
                padding: 12px 14px;
                border-bottom: 1px solid #f3f4f6;
            }
            #${PANEL_ID} .peekle-lc-title {
                margin: 0;
                color: #e24ea0;
                font-size: 15px;
                font-weight: 700;
            }
            #${PANEL_ID} .peekle-lc-close {
                width: 28px;
                height: 28px;
                border: 0;
                border-radius: 6px;
                background: #f3f4f6;
                color: #374151;
                cursor: pointer;
                font-size: 18px;
                line-height: 1;
            }
            #${PANEL_ID} .peekle-lc-body {
                padding: 12px 14px 14px;
            }
            #${PANEL_ID} .peekle-lc-status {
                display: inline-flex;
                align-items: center;
                min-height: 24px;
                padding: 2px 8px;
                border-radius: 6px;
                background: #e8f8ef;
                color: #128347;
                font-weight: 700;
            }
            #${PANEL_ID} .peekle-lc-status[data-success="false"] {
                background: #fff3f0;
                color: #d13f1f;
            }
            #${PANEL_ID} .peekle-lc-grid {
                display: grid;
                grid-template-columns: 96px minmax(0, 1fr);
                gap: 7px 10px;
                margin-top: 12px;
            }
            #${PANEL_ID} .peekle-lc-label {
                color: #6b7280;
                font-weight: 600;
            }
            #${PANEL_ID} .peekle-lc-value {
                min-width: 0;
                overflow-wrap: anywhere;
                color: #111827;
            }
            #${PANEL_ID} .peekle-lc-code-label {
                margin: 14px 0 6px;
                color: #6b7280;
                font-weight: 700;
            }
            #${PANEL_ID} .peekle-lc-code {
                width: 100%;
                min-height: 160px;
                max-height: 260px;
                resize: vertical;
                border: 1px solid #e5e7eb;
                border-radius: 6px;
                padding: 10px;
                background: #f9fafb;
                color: #111827;
                font-family: "Cascadia Code", Consolas, monospace;
                font-size: 12px;
                line-height: 1.45;
                white-space: pre;
            }
        `;
        (document.head || document.documentElement).appendChild(style);
    }

    function appendRow(grid, label, value) {
        const labelElement = document.createElement('div');
        labelElement.className = 'peekle-lc-label';
        labelElement.textContent = label;

        const valueElement = document.createElement('div');
        valueElement.className = 'peekle-lc-value';
        valueElement.textContent = value || '-';

        grid.append(labelElement, valueElement);
    }

    function renderPanel(data) {
        ensureStyle();

        const existing = document.getElementById(PANEL_ID);
        if (existing) existing.remove();

        const panel = document.createElement('section');
        panel.id = PANEL_ID;

        const header = document.createElement('div');
        header.className = 'peekle-lc-header';

        const title = document.createElement('h2');
        title.className = 'peekle-lc-title';
        title.textContent = 'Peekle LeetCode 제출 감지';

        const closeButton = document.createElement('button');
        closeButton.className = 'peekle-lc-close';
        closeButton.type = 'button';
        closeButton.setAttribute('aria-label', '닫기');
        closeButton.textContent = 'x';
        closeButton.addEventListener('click', () => panel.remove());

        header.append(title, closeButton);

        const body = document.createElement('div');
        body.className = 'peekle-lc-body';

        const status = document.createElement('div');
        status.className = 'peekle-lc-status';
        status.dataset.success = String(Boolean(data.isSuccess));
        status.textContent = data.result || '감지됨';

        const grid = document.createElement('div');
        grid.className = 'peekle-lc-grid';

        appendRow(grid, '제출 ID', data.submitId);
        appendRow(grid, 'externalId', data.externalId);
        appendRow(grid, '문제명', data.displayTitle || data.title);
        appendRow(grid, 'titleSlug', data.titleSlug);
        appendRow(grid, '난이도', data.difficulty);
        appendRow(grid, '태그', Array.isArray(data.tags)
            ? data.tags.map((tag) => tag.name || tag.key).join(', ')
            : '');
        appendRow(grid, '태그 key', Array.isArray(data.tagKeys) ? data.tagKeys.join(', ') : '');
        appendRow(grid, '문제 URL', data.problemUrl);
        appendRow(grid, '언어', data.language);
        appendRow(grid, '실행 시간', data.runtimeMs ? data.runtimeMs + ' ms' : '');
        appendRow(grid, '메모리', data.memoryMb ? data.memoryMb + ' MB' : '');
        appendRow(grid, '제출 시각(KST)', data.submittedAt);

        const codeLabel = document.createElement('div');
        codeLabel.className = 'peekle-lc-code-label';
        codeLabel.textContent = '내 코드';

        const code = document.createElement('textarea');
        code.className = 'peekle-lc-code';
        code.readOnly = true;
        code.value = data.code || '코드를 아직 읽지 못했습니다.';

        body.append(status, grid, codeLabel, code);
        panel.append(header, body);
        (document.body || document.documentElement).appendChild(panel);
    }

    function showFeedbackToast(data) {
        ensureStyle();

        const toast = document.createElement('div');
        const isSuccess = Boolean(data?.success);
        toast.style.cssText = `
            position: fixed;
            top: 80px;
            right: 24px;
            width: min(380px, calc(100vw - 48px));
            z-index: 2147483647;
            border: 1px solid ${isSuccess ? 'rgba(18, 131, 71, 0.22)' : 'rgba(209, 63, 31, 0.22)'};
            border-top: 4px solid ${isSuccess ? '#128347' : '#d13f1f'};
            border-radius: 8px;
            background: #ffffff;
            color: #111827;
            box-shadow: 0 18px 50px rgba(17, 24, 39, 0.18);
            padding: 16px 18px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        `;

        const title = document.createElement('div');
        title.style.cssText = `
            margin-bottom: 6px;
            color: ${isSuccess ? '#128347' : '#d13f1f'};
            font-size: 15px;
            font-weight: 800;
        `;
        title.textContent = isSuccess ? 'Peekle에 기록했어요' : 'Peekle 기록 실패';

        const message = document.createElement('div');
        message.style.cssText = 'font-size: 13px; line-height: 1.45; color: #4b5563;';
        message.textContent = data?.message || (isSuccess ? 'LeetCode 풀이 기록이 저장되었습니다.' : '잠시 후 다시 시도해주세요.');

        if (isSuccess && data?.earnedPoints !== undefined) {
            const points = document.createElement('div');
            points.style.cssText = 'margin-top: 8px; font-size: 13px; font-weight: 700; color: #111827;';
            points.textContent = `획득 포인트: +${data.earnedPoints || 0}`;
            toast.append(title, message, points);
        } else {
            toast.append(title, message);
        }

        document.body.appendChild(toast);
        window.setTimeout(() => {
            toast.style.transition = 'opacity 180ms ease, transform 180ms ease';
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(20px)';
            window.setTimeout(() => toast.remove(), 200);
        }, 5000);
    }

    function sendAcceptedSubmission(data) {
        if (!data.isSuccess || !data.submitId) return;

        const key = 'leetcode:' + data.submitId;
        if (sentSubmissionKeys.has(key)) return;
        sentSubmissionKeys.add(key);

        try {
            chrome.runtime.sendMessage({
                type: 'LEETCODE_SUBMISSION',
                payload: {
                    ...data,
                    englishTitle: data.title
                }
            }, (response) => {
                if (chrome.runtime.lastError) {
                    sentSubmissionKeys.delete(key);
                    showFeedbackToast({
                        success: false,
                        message: '확장 프로그램 연결이 끊겨 LeetCode 제출을 저장하지 못했습니다.'
                    });
                    return;
                }

                if (!response?.success && !response?.duplicate) {
                    sentSubmissionKeys.delete(key);
                }
            });
        } catch (error) {
            sentSubmissionKeys.delete(key);
            showFeedbackToast({
                success: false,
                message: 'LeetCode 제출 저장 요청 중 오류가 발생했습니다.'
            });
        }
    }

    function scan() {
        cacheProblemContext();

        const submissionInfo = parseSubmissionUrl();
        if (!submissionInfo) return;

        const data = extractSubmissionData(submissionInfo);
        if (!data) return;

        const key = data.slug + ':' + data.submitId + ':' + data.result;
        if (lastRenderedSubmissionKey === key && document.getElementById(PANEL_ID)) return;

        lastRenderedSubmissionKey = key;
        renderPanel(data);
        sendAcceptedSubmission(data);
        console.log('[Peekle LeetCode] Submission detected:', data);
    }

    function start() {
        if (scanTimer) return;

        scan();
        scanTimer = setInterval(scan, 1000);

        const observer = new MutationObserver(() => {
            window.clearTimeout(observer.pendingScan);
            observer.pendingScan = window.setTimeout(scan, 250);
        });
        observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
    }

    start();

    globalThis.chrome?.runtime?.onMessage?.addListener((request) => {
        if (request?.type !== 'SHOW_FEEDBACK') return;
        showFeedbackToast(request.payload || {});
    });
})();
