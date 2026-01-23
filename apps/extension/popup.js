document.addEventListener('DOMContentLoaded', () => {
    const loggedInBtns = document.getElementById('logged-in-btns');
    const loggedOutBtns = document.getElementById('logged-out-btns');
    const nicknameEl = document.getElementById('nickname');
    const statusEl = document.getElementById('status');

    // 1. 초기 연동 여부 확인
    chrome.storage.local.get(['peekle_token', 'userData'], (result) => {
        if (result.peekle_token) {
            // [연동 상태]
            loggedInBtns.style.display = 'flex';
            loggedOutBtns.style.display = 'none';

            if (result.userData) updateUI(result.userData);
            fetchFreshData(result.peekle_token);
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

    // 3. 버튼 이벤트 리스너
    document.getElementById('link-site-btn').onclick = () => {
        chrome.tabs.create({ url: 'http://localhost:3000/profile/me' }); // 연동 페이지 주소
    };

    const goSiteBtn = document.getElementById('go-site-btn');
    if (goSiteBtn) {
        goSiteBtn.onclick = () => {
            chrome.tabs.create({ url: 'http://localhost:3000/profile/me' });
        };
    }

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
            const response = await fetch(`http://localhost:8080/api/users/me/profile`, {
                headers: { 'X-Peekle-Token': token }
            });

            if (response.ok) {
                const json = await response.json();
                if (json.success && json.data) {
                    const userData = json.data;

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
        document.getElementById('league-name').innerText = data.leagueName || "Unranked";
        document.getElementById('user-score').innerText = (data.score || 0) + "점";
        document.getElementById('user-rank').innerText = (data.rank ? data.rank + "위" : "-");

        // 프로필 이미지 표시 (무조건 이미지 사용)
        const tierIconEl = document.getElementById('tier-icon');
        // 이미지가 없으면 기본값(예: empty string) 처리 -> onerror로 핸들링하거나 빈 이미지
        const imgUrl = data.profileImage || "";

        tierIconEl.innerHTML = `<img src="${imgUrl}" alt="Profile" style="width:100%; height:100%; object-fit:cover; border-radius:50%; background-color:#eee;">`;
    }
});