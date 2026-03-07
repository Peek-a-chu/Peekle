document.addEventListener('DOMContentLoaded', () => {
    // [Check Env]
    let frontendBaseUrl = 'https://peekle.today'; // Default to prod
    let apiBaseUrl = 'https://peekle.today';     // Default to prod

    chrome.runtime.sendMessage({ type: 'CHECK_ENV' }, (response) => {
        if (response) {
            if (response.isLocal) {
                const badge = document.getElementById('local-badge');
                if (badge) badge.style.display = 'inline-block';
            }
            if (response.frontendUrl) {
                frontendBaseUrl = response.frontendUrl;
            }
            if (response.apiUrl) {
                apiBaseUrl = response.apiUrl;
            }
        }

        // Initialize Data Fetching AFTER Env Check to ensure URL is correct
        initPopupData();
    });

    const loggedInBtns = document.getElementById('logged-in-btns');
    const loggedOutBtns = document.getElementById('logged-out-btns');
    const nicknameEl = document.getElementById('nickname');
    const statusEl = document.getElementById('status');

    // 3. 버튼 이벤트 리스너
    document.getElementById('link-site-btn').onclick = () => {
        chrome.tabs.create({ url: `${frontendBaseUrl}/profile/me` });
    };

    const goSiteBtn = document.getElementById('go-site-btn');
    if (goSiteBtn) {
        goSiteBtn.onclick = () => {
            chrome.tabs.create({ url: `${frontendBaseUrl}/profile/me` });
        };
    }

    // 0. 테마 적용 (저장된 설정 확인)
    chrome.storage.local.get(['themeSettings'], (result) => {
        if (result.themeSettings) {
            applyTheme(result.themeSettings);
        }
    });

    // [New] 실시간 테마 변경 감지
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes.themeSettings) {
            applyTheme(changes.themeSettings.newValue);
        }
    });

    function initPopupData() {
        // 1. 초기 연동 여부 확인
        chrome.storage.local.get(['peekle_token', 'userData'], (result) => {
            if (result.peekle_token) {
                // [연동 상태]
                loggedInBtns.style.display = 'flex';
                loggedOutBtns.style.display = 'none';

                if (result.userData) updateUI(result.userData);
                fetchFreshData(result.peekle_token);
                checkContextStatus(); // Check for pending context
            } else {
                // [미연동 상태]
                loggedInBtns.style.display = 'none';
                loggedOutBtns.style.display = 'flex';

                nicknameEl.innerText = "로그인이 필요해요";
                document.getElementById('league-name').innerText = "-";
                document.getElementById('tier-icon').innerText = "❓";
                statusEl.innerText = "사이트에서 계정을 연동해 주세요.";
            }
        });
    }

    // 2. 로그아웃 함수 (토큰 지우고 버튼 갈아끼우기)
    function handleLogout() {
        if (confirm('익스텐션 연동을 해제하시겠습니까?')) {
            chrome.storage.local.remove(['peekle_token', 'userData'], () => {
                // UI 즉시 반영
                loggedInBtns.style.display = 'none';
                loggedOutBtns.style.display = 'flex';
                nicknameEl.innerText = "로그인이 필요해요";
                statusEl.innerText = "연동이 해제되었습니다.";
                // 팝업을 닫거나 새로고침
                location.reload();
            });
        }
    }

    // 3. 버튼 이벤트 리스너 (Moved to top with dynamic URL)
    document.getElementById('logout-btn').onclick = handleLogout;

    // Refresh 버튼 (새로고침)
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
        refreshBtn.onclick = () => {
            location.reload();
        };
    }

    // 4. 데이터 갱신 (Backend API Call)
    async function fetchFreshData(token) {
        try {
            statusEl.innerText = "최신 정보를 가져오는 중...";
            const response = await fetch(`${apiBaseUrl}/api/users/me/profile`, {
                headers: { 'X-Peekle-Token': token }
            });

            if (response.ok) {
                const json = await response.json();
                if (json.success && json.data) {
                    const userData = json.data;

                    // [New] 추가 상태 정보 조회 (Streak + Today Solved)
                    const statusResponse = await fetch(`${apiBaseUrl}/api/users/me/extension-status`, {
                        headers: { 'X-Peekle-Token': token }
                    });

                    if (statusResponse.ok) {
                        const statusJson = await statusResponse.json();
                        if (statusJson.success && statusJson.data) {
                            userData.streakCurrent = statusJson.data.streakCurrent;
                            userData.isSolvedToday = statusJson.data.isSolvedToday;
                            userData.groupRank = statusJson.data.groupRank;
                            userData.leagueStatus = statusJson.data.leagueStatus;
                            userData.bojId = statusJson.data.bojId;
                            userData.leagueGroupId = statusJson.data.leagueGroupId;
                        }
                    }

                    // 캐싱
                    chrome.storage.local.set({ userData: userData });
                    updateUI(userData);
                    statusEl.innerText = "최신 데이터로 업데이트되었습니다.";
                } else {
                    // 토큰이 만료되었거나 유효하지 않은 경우 처리
                    statusEl.innerText = "정보를 가져오는데 실패했습니다.";
                }
            } else {
                statusEl.innerText = "서버와 통신이 원활하지 않습니다.";
            }
        } catch (e) {
            console.error(e);
            statusEl.innerText = "네트워크 오류가 발생했습니다.";
        }
    }

    // 5. UI 업데이트
    function updateUI(data) {
        if (!data) return;

        nicknameEl.innerText = data.nickname || "알 수 없음";
        document.getElementById('boj-id').innerText = data.bojId ? `boj: ${data.bojId}` : "";
        document.getElementById('league-name').innerText = getLeagueDisplayName(data.leagueName);
        document.getElementById('user-score').innerText = (data.score || 0) + "점";

        // 순위와 상태 함께 표시
        const rankEl = document.getElementById('user-rank');
        if (data.totalGroupMembers < 4) {
            // 그룹 명수가 4명 미만이면: 리그명이 stone이면 배치 대기, 아니면 쉬는 중
            const leagueName = (data.leagueName || '').toLowerCase();
            const waitMsg = leagueName === 'stone' ? '배치 대기' : '이번주 쉬는 중';
            rankEl.innerHTML = `<span style="font-size: 12px; color: var(--muted-foreground);">${waitMsg}</span>`;
        } else if (data.groupRank) {
            const statusText = getStatusText(data.leagueStatus);
            rankEl.innerHTML = `<span style="font-weight: 700;">${data.groupRank}위</span> <span style="font-size: 10px; color: ${getStatusColor(data.leagueStatus)};">${statusText}</span>`;
        } else if (data.rank) {
            rankEl.innerText = data.rank + "위";
        } else {
            rankEl.innerText = "-";
        }

        // [New] 스트릭 및 오늘 문제 상태
        const streakEl = document.getElementById('user-streak');
        if (streakEl) streakEl.innerText = (data.streakCurrent || 0) + "일";

        const todayStatusEl = document.getElementById('today-status');
        if (todayStatusEl) {
            if (data.isSolvedToday) {
                todayStatusEl.innerText = "오늘의 문제 완료! 🎉";
                todayStatusEl.style.color = "var(--primary)";
            } else {
                todayStatusEl.innerText = "아직 문제를 풀지 않았어요";
                todayStatusEl.style.color = "var(--muted-foreground)";
            }
        }

        // 프로필 이미지 표시 (없으면 DiceBear API 사용)
        const tierIconEl = document.getElementById('tier-icon');
        const rawImgUrl = data.profileImg || data.profileImage;
        let imgUrl;

        if (rawImgUrl) {
            // URL에 공백 등이 있을 수 있으므로 인코딩 후 Next.js Image Proxy 사용
            const encodedUrl = encodeURIComponent(rawImgUrl);
            imgUrl = `${frontendBaseUrl}/_next/image?url=${encodedUrl}&w=256&q=75`;
        } else {
            imgUrl = `https://api.dicebear.com/9.x/bottts-neutral/svg?seed=${encodeURIComponent(data.nickname || 'user')}`;
        }

        tierIconEl.innerHTML = `<img src="${imgUrl}" alt="Profile Image" style="width:100%; height:100%; object-fit:cover; border-radius:50%; background-color:#eee;">`;

    }

    // Helper: Get status text
    function getStatusText(status) {
        const statusMap = {
            'PROMOTE': '승급예정',
            'STAY': '유지',
            'DEMOTE': '강등위기'
        };
        return statusMap[status] || '';
    }

    // Helper: Get status color
    function getStatusColor(status) {
        const colorMap = {
            'PROMOTE': 'var(--primary)',
            'STAY': 'var(--muted-foreground)',
            'DEMOTE': '#ef4444'
        };
        return colorMap[status] || 'var(--muted-foreground)';
    }

    // Helper: Convert league key/name to Korean display
    function getLeagueDisplayName(leagueName) {
        if (!leagueName) return '언랭크';

        const normalized = String(leagueName).trim().toLowerCase();
        const leagueMap = {
            stone: '스톤',
            bronze: '브론즈',
            silver: '실버',
            gold: '골드',
            platinum: '플래티넘',
            emerald: '에메랄드',
            diamond: '다이아',
            ruby: '루비',
            unranked: '언랭크',
            unknown: '언랭크'
        };

        return leagueMap[normalized] || String(leagueName);
    }

    // 테마 적용 헬퍼
    function applyTheme(settings) {
        const { mode, accentColor, customColor } = settings;
        const root = document.documentElement;

        // 1. Light/Dark Base Colors
        if (mode === 'dark') {
            root.style.setProperty('--background', '#09090b'); // zinc-950
            root.style.setProperty('--foreground', '#d4d4d8'); // zinc-300 (Grayish text)
            root.style.setProperty('--card', '#18181b'); // zinc-900
            root.style.setProperty('--card-foreground', '#e4e4e7'); // zinc-200 (Slightly brighter than foreground)
            root.style.setProperty('--muted', '#27272a'); // zinc-800
            root.style.setProperty('--muted-foreground', '#a1a1aa'); // zinc-400
            root.style.setProperty('--border', '#27272a');
            root.style.setProperty('--primary-foreground', '#18181b'); // dark text on bright primary
        } else {
            root.style.setProperty('--background', '#f4f4f7');
            root.style.setProperty('--foreground', '#09090b');
            root.style.setProperty('--card', '#ffffff');
            root.style.setProperty('--card-foreground', '#09090b');
            root.style.setProperty('--muted', '#f3f4f6');
            root.style.setProperty('--muted-foreground', '#71717a');
            root.style.setProperty('--border', '#e4e4e7');
            root.style.setProperty('--primary-foreground', '#ffffff');
        }

        // 2. Accent Color
        let primaryColor = '#E24EA0'; // Default Pink
        const colors = {
            blue: '#3b82f6',
            skyblue: '#06b6d4',
            orange: '#f97316',
            pink: '#db2777',
            green: '#22c55e',
            lime: '#84cc16'
        };

        if (accentColor === 'custom' && customColor) {
            primaryColor = customColor;
        } else if (colors[accentColor]) {
            primaryColor = colors[accentColor];
        }

        root.style.setProperty('--primary', primaryColor);

        // 추가: 오늘 문제 완료 상태 텍스트 색상 실시간 반영용 (변수가 이미 설정되어 있으므로 명시적 호출 불필요할 수 있으나 안전장치)
        const statusText = document.getElementById('today-status');
        if (statusText) {
            if (statusText.innerText.includes('완료')) {
                statusText.style.color = 'var(--primary)';
            } else {
                statusText.style.color = 'var(--muted-foreground)';
            }
        }
    }

    // Helper: Check Context (Study/Game/Extension)
    function checkContextStatus() {
        chrome.storage.local.get(['pending_submission'], (result) => {
            const contextEl = document.getElementById('context-status');
            if (contextEl && result.pending_submission) {
                const task = result.pending_submission;
                const type = task.sourceType || 'EXTENSION';

                if (type === 'STUDY') {
                    contextEl.innerText = `📚 스터디 진행 중`;
                    contextEl.style.color = 'var(--primary)';
                } else if (type === 'GAME') {
                    contextEl.innerText = `🎮 게임 진행 중`;
                    contextEl.style.color = '#f97316'; // Orange
                } else {
                    contextEl.innerText = `📝 문제 풀이 중`;
                    contextEl.style.color = 'var(--foreground)';
                }

                if (task.consumed) {
                    contextEl.innerText += " (제출 대기)";
                }
            } else if (contextEl) {
                contextEl.innerText = `대기 중인 작업 없음`;
                contextEl.style.color = 'var(--muted-foreground)';
            }
        });
    }
});
