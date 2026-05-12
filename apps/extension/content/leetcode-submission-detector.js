(function () {
    const LEETCODE_HOSTS = new Set(['leetcode.com', 'www.leetcode.com']);
    if (!LEETCODE_HOSTS.has(window.location.hostname)) return;

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
                    console.warn('[Peekle LeetCode] Failed to send submission to background.', chrome.runtime.lastError);
                    return;
                }

                if (!response?.success && !response?.duplicate) {
                    sentSubmissionKeys.delete(key);
                }
            });
        } catch (error) {
            sentSubmissionKeys.delete(key);
            console.warn('[Peekle LeetCode] Failed to request submission save.', error);
        }
    }

    function scan() {
        cacheProblemContext();

        const submissionInfo = parseSubmissionUrl();
        if (!submissionInfo) return;

        const data = extractSubmissionData(submissionInfo);
        if (!data) return;

        const key = data.slug + ':' + data.submitId + ':' + data.result;
        if (lastRenderedSubmissionKey === key) return;

        lastRenderedSubmissionKey = key;
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
})();
