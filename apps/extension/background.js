// background.js - 출퇴근 알림 관리

// 확장프로그램 설치 또는 업데이트 시 알람 설정
chrome.runtime.onInstalled.addListener(() => {
    console.log('SSABAP 확장프로그램 설치됨 - 알람 설정 시작');
    setupAlarms();
});

// 확장프로그램 시작 시에도 알람 설정
chrome.runtime.onStartup.addListener(() => {
    console.log('SSABAP 확장프로그램 시작됨 - 알람 설정');
    setupAlarms();
});

// 알람 설정 함수
function setupAlarms() {
    // 기존 알람 모두 제거
    chrome.alarms.clearAll(() => {
        console.log('기존 알람 모두 제거됨');

        // 출근 알람 (오전 8:58)
        createDailyAlarm('morning-checkin', 8, 58);

        // 퇴실 준비 알람 (오후 5:50)
        createDailyAlarm('evening-prepare', 17, 50);

        // 퇴근 알람 (오후 6:00)
        createDailyAlarm('evening-checkout', 18, 0);

        console.log('모든 알람 설정 완료');
    });
}

// 매일 반복되는 알람 생성
function createDailyAlarm(name, hour, minute) {
    const now = new Date();
    const scheduledTime = new Date();

    // KST 기준으로 시간 설정
    scheduledTime.setHours(hour, minute, 0, 0);

    // 만약 오늘 해당 시간이 이미 지났다면 내일로 설정
    if (scheduledTime <= now) {
        scheduledTime.setDate(scheduledTime.getDate() + 1);
    }

    // 알람 생성 (periodInMinutes: 1440 = 24시간)
    chrome.alarms.create(name, {
        when: scheduledTime.getTime(),
        periodInMinutes: 1440 // 24시간마다 반복
    });

    console.log(`알람 "${name}" 설정됨:`, scheduledTime.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }));
}

// 알람이 울릴 때 처리
chrome.alarms.onAlarm.addListener((alarm) => {
    console.log('알람 발생:', alarm.name);

    let title = '';
    let message = '';

    switch (alarm.name) {
        case 'morning-checkin':
            title = '☀️ 입실 체크';
            message = '입실하셨나요? 좋은 하루 되세요! 😊';
            break;

        case 'evening-prepare':
            title = '⏰ 퇴실 준비';
            message = '곧 퇴실 시간입니다! 준비하세요~ 🎒';
            break;

        case 'evening-checkout':
            title = '🌙 퇴실 체크';
            message = '퇴실하세요!! 오늘도 수고하셨습니다! 👏';
            break;

        default:
            return;
    }

    // 알림 표시
    chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: title,
        message: message,
        priority: 2
    }, (notificationId) => {
        console.log('알림 표시됨:', notificationId);
    });
});

// 알림 클릭 시 처리 (선택사항)
chrome.notifications.onClicked.addListener((notificationId) => {
    console.log('알림 클릭됨:', notificationId);
    // 필요시 확장프로그램 팝업 열기 등의 동작 추가 가능
});


// --- Baekjoon Solver Logic ---

const PROCESSED_SUBMISSIONS_KEY = 'processed_submissions';

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'SOLVED') {
        handleSolvedSubmission(request.payload);
    }
    return true; // Keep channel open
});

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
        const response = await fetch('http://localhost:8080/api/submissions/general', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            console.log('Backend sync successful');
        } else {
            console.error('Backend sync failed:', response.status);
        }
    } catch (error) {
        console.error('Failed to send to backend:', error);
    }
}

async function handleSolvedSubmission(payload) {
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

        await sendToBackend({
            problemId: parseInt(problemId) || 0,
            problemTitle: problemInfo ? problemInfo.titleKo : "",
            problemTier: problemInfo ? String(problemInfo.level) : "0",
            language: language,
            code: code,
            memory: memoryInt,
            executionTime: timeInt,
            result: result,
            submittedAt: new Date().toISOString(),
            submitId: submitId
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
            const titleMsg = problemInfo ? `"${problemInfo.titleKo}"` : `${problemId}번`;

            // Show notification
            chrome.notifications.create(`solved-${submitId}`, {
                type: 'basic',
                iconUrl: 'icons/icon128.png',
                title: '문제 해결! 🎉',
                message: `${titleMsg} 통과! (${memory}KB / ${time}ms)`,
                priority: 2
            }, (notificationId) => {
                console.log('Solved notification shown:', notificationId);
            });
        });

    });
}
