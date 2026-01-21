document.addEventListener('DOMContentLoaded', () => {
    updateList();

    // Update list when storage changes
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local' && changes.processed_submissions) {
            updateList();
        }
    });

    // Test Button Listener
    const testBtn = document.getElementById('test-submit-btn');
    if (testBtn) {
        testBtn.addEventListener('click', sendTestSubmission);
    }
});

async function sendTestSubmission() {
    const statusEl = document.getElementById('test-status');
    statusEl.innerText = '전송 중...';

    const testData = {
        problemId: 1000,
        problemTitle: "A+B",
        problemTier: "1",
        language: "Java",
        code: "public class Main { public static void main(String[] args) { System.out.println(\"Hello Extension!\"); } }",
        memory: 14320,
        executionTime: 120,
        result: "맞았습니다!!",
        submittedAt: new Date().toISOString(),
        submitId: "TEST_" + Date.now()
    };

    try {
        const response = await fetch('http://localhost:8080/api/submissions/general', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(testData)
        });

        if (response.ok) {
            statusEl.innerText = '✅ 전송 성공! 백엔드 로그 확인.';
            statusEl.style.color = 'green';
        } else {
            statusEl.innerText = `❌ 실패: ${response.status}`;
            statusEl.style.color = 'red';
        }
    } catch (error) {
        statusEl.innerText = `❌ 에러: ${error.message}`;
        statusEl.style.color = 'red';
    }
}

function updateList() {
    chrome.storage.local.get(['processed_submissions'], (items) => {
        const solved = items.processed_submissions || {};
        const listEl = document.getElementById('solved-list');

        const submissions = Object.values(solved).sort((a, b) =>
            new Date(b.timestamp) - new Date(a.timestamp)
        );

        if (submissions.length > 0) {
            listEl.innerHTML = '';
            submissions.slice(0, 10).forEach(sub => {
                const item = document.createElement('div');
                item.className = 'solved-item';

                const date = new Date(sub.timestamp);
                const timeString = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;

                // Show title if available, otherwise just ID
                const displayTitle = sub.title ? `[${sub.problemId}] ${sub.title}` : `${sub.problemId}번 문제`;

                item.innerHTML = `
                    <div class="item-header">
                        <div class="solved-info">
                            <span class="solved-id">${displayTitle}</span>
                            <span class="timestamp">${timeString}</span>
                        </div>
                        <div class="check-icon">✓</div>
                    </div>
                    <div class="item-details">
                        <span><span class="stat-badge">M</span> ${sub.memory || 0} KB</span>
                        <span><span class="stat-badge">T</span> ${sub.time || 0} ms</span>
                        <span><span class="stat-badge">L</span> ${sub.language || '-'}</span>
                    </div>
                    ${sub.code ? `<div class="code-toggle">소스 코드 보기</div><div class="code-block">${escapeHtml(sub.code)}</div>` : ''}
                `;

                // Add click handler for code toggle
                const toggle = item.querySelector('.code-toggle');
                if (toggle) {
                    toggle.addEventListener('click', () => {
                        const block = item.querySelector('.code-block');
                        if (block.style.display === 'block') {
                            block.style.display = 'none';
                            toggle.innerText = '소스 코드 보기';
                        } else {
                            block.style.display = 'block';
                            toggle.innerText = '소스 코드 접기';
                        }
                    });
                }

                listEl.appendChild(item);
            });
        } else {
            listEl.innerHTML = '<div class="empty-state">아직 감지된 해결 내역이 없습니다.<br>백준에서 문제를 풀어보세요!</div>';
        }
    });
}

function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
