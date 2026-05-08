(function () {
    const LEETCODE_HOSTS = new Set(['leetcode.com', 'www.leetcode.com']);
    if (!LEETCODE_HOSTS.has(window.location.hostname)) return;

    const STORAGE_KEY = 'leetcodeKoreanEnabled';
    const STYLE_ID = 'peekle-leetcode-localizer-style';
    const originalTextByNode = new WeakMap();
    const originalAttributesByElement = new WeakMap();
    let enabled = false;

    const TEXT_TRANSLATIONS = new Map([
        ['Problem List', '문제 목록'],
        ['Problems', '문제'],
        ['Contest', '대회'],
        ['Discuss', '토론'],
        ['Interview', '인터뷰'],
        ['Online Interview', '온라인 인터뷰'],
        ['Assessment', '평가'],
        ['Account', '계정'],
        ['Privacy', '개인정보'],
        ['Billing', '결제'],
        ['No Subscription', '구독 없음'],
        ['Enjoy an', '더 나은'],
        ['enhanced LeetCoding experience', 'LeetCoding 경험을'],
        ['for as low as', '월'],
        ['/month.', '부터 이용하세요.'],
        ['Go Premium', '프리미엄으로 업그레이드'],
        ['Add Card', '카드 추가'],
        ['Billing History', '결제 내역'],
        ['Contact Us', '문의하기'],
        ['Contact us', '문의하기'],
        ['Need help?', '도움이 필요하신가요?'],
        ['数据为空', '데이터 없음'],
        ['Notifications', '알림'],
        ['Site Notification', '사이트 알림'],
        ['Receive Website / Browser Notifications', '웹사이트 / 브라우저 알림을 받습니다.'],
        ['Ranking Updates', '순위 업데이트'],
        ['Post Comments', '게시글 댓글'],
        ['Awards Received', '받은 수상'],
        ['Receive notifications via your primary email.', '기본 이메일로 알림을 받습니다.'],
        ['Important Announcements', '중요 공지'],
        ['Weekly Newsletter', '주간 뉴스레터'],
        ['Promotion Events', '프로모션 이벤트'],
        ['Profile Settings', '프로필 설정'],
        ['Profile Visibility', '프로필 공개 범위'],
        ['We respect your privacy and never share your data without consent.', '개인정보를 존중하며 동의 없이 데이터를 공유하지 않습니다.'],
        ['Appear on the Study Plan Leaderboard', '학습 계획 리더보드에 표시'],
        ['Allow companies to contact me via LeetCode', '회사에서 LeetCode를 통해 연락할 수 있도록 허용'],
        ['Hide my following list', '내 팔로잉 목록 숨기기'],
        ['Hide my follower list', '내 팔로워 목록 숨기기'],
        ['On', '켜짐'],
        ['Off', '꺼짐'],
        ['Store', '상점'],
        ['Redeem', '교환'],
        ['Search', '검색'],
        ['search', '검색'],
        ['搜索', '검색'],
        ['Sorted by custom', '사용자 지정 정렬'],
        ['Filter', '필터'],
        ['Match', '조건'],
        ['All', '모두'],
        ['Any', '하나라도'],
        ['of the following filters:', '일치:'],
        ['Status', '상태'],
        ['Custom', '사용자 지정'],
        ['Frequency', '빈도'],
        ['Subscribe to unlock frequency', '구독하면 빈도를 확인할 수 있어요'],
        ['Contest Point', '대회 점수'],
        ['Description', '문제 설명'],
        ['Editorial', '해설'],
        ['Solutions', '풀이'],
        ['Submissions', '제출 내역'],
        ['All Submissions', '전체 제출 내역'],
        ['Code', '코드'],
        ['Analysis', '분석'],
        ['Subscribe to Unlock More Analysis', '구독하면 더 많은 분석을 확인할 수 있어요'],
        ['Analysis Left', '분석 남음'],
        ['Approach', '접근 방식'],
        ['Efficiency', '효율성'],
        ['Code Style', '코드 스타일'],
        ['Congratulations! You passed this attempt. Although not your first try overall, it\'s a great step forward in mastering string manipulation problems!', '축하합니다! 이번 시도를 통과했습니다. 전체 기준으로 첫 시도는 아니지만, 문자열 처리 문제를 익히는 데 좋은 진전입니다!'],
        ['Current:', '현재:'],
        ['Suggested:', '권장:'],
        ['Current complexity:', '현재 복잡도:'],
        ['Suggested complexity:', '권장 복잡도:'],
        ['Key Idea:', '핵심 아이디어:'],
        ['Suggestions:', '제안:'],
        ['Readability:', '가독성:'],
        ['Structure:', '구조:'],
        ['Good', '좋음'],
        ['Excellent', '훌륭함'],
        ['Brute-Force Search', '브루트포스 탐색'],
        ['Iteratively comparing characters at the same index across all strings to identify the common prefix.', '모든 문자열의 같은 인덱스 문자를 반복해서 비교해 공통 접두사를 찾습니다.'],
        ['Perfect efficiency! Your solution already achieves the optimal time and space complexity.', '효율성이 완벽합니다! 이미 최적의 시간 및 공간 복잡도를 달성했습니다.'],
        ['Add spaces around operators and break long lines to improve visual clarity and readability.', '연산자 주변에 공백을 추가하고 긴 줄을 나누면 시각적 명확성과 가독성이 좋아집니다.'],
        ['Solution', '풀이'],
        ['Runtime', '실행 시간'],
        ['Memory', '메모리'],
        ['Beats', '상위'],
        ['testcases passed', '테스트케이스 통과'],
        ['submitted at', '제출 시간'],
        ['Contribute a testcase', '테스트케이스 기여하기'],
        ['View more', '더 보기'],
        ['More challenges', '추가 도전 문제'],
        ['Write your notes here', '여기에 노트를 작성하세요'],
        ['Select related tags', '관련 태그 선택'],
        ['Copy', '복사'],
        ['Copy Link', '링크 복사'],
        ['Copy To Editor', '에디터로 복사'],
        ['Testcase', '테스트케이스'],
        ['Test Result', '테스트 결과'],
        ['Console', '콘솔'],
        ['Run', '실행'],
        ['Submit', '제출'],
        ['Pending...', '대기 중...'],
        ['Speed Up', '속도 높이기'],
        ['Debug', '디버그'],
        ['Debugging...', '디버깅 중...'],
        ['Stop Debug', '디버그 중지'],
        ['Easy', '쉬움'],
        ['Medium', '보통'],
        ['Hard', '어려움'],
        ['Difficulty', '난이도'],
        ['Topics', '주제'],
        ['Companies', '회사'],
        ['Language', '언어'],
        ['Todo', '미해결'],
        ['Attempted', '시도함'],
        ['Hint', '힌트'],
        ['Accepted', '통과'],
        ['Wrong Answer', '오답'],
        ['Acceptance', '정답률'],
        ['Question ID', '문제 ID'],
        ['Last Submitted Time', '마지막 제출 시간'],
        ['Tags', '태그'],
        ['Acceptance Rate', '정답률'],
        ['Constraints:', '제약 조건:'],
        ['Follow-up:', '추가 질문:'],
        ['Input', '입력'],
        ['Input:', '입력:'],
        ['Output', '출력'],
        ['Output:', '출력:'],
        ['Stdout', '표준 출력'],
        ['Expected', '예상값'],
        ['Explanation:', '설명:'],
        ['Diff', '차이'],
        ['Similar Questions', '비슷한 문제'],
        ['Discussion', '토론'],
        ['For you', '추천'],
        ['Career', '커리어'],
        ['Compensation', '보상'],
        ['Create', '작성'],
        ['All Time', '전체 기간'],
        ['💡 Discussion Rules', '💡 토론 규칙'],
        ["1. Please don't post", '1. 이 토론에는'],
        ['any solutions', '어떤 풀이도'],
        ['in this discussion.', '올리지 마세요.'],
        ['2. The problem discussion is for asking questions about the problem or for sharing tips - anything except for solutions.', '2. 문제 토론은 문제에 대한 질문이나 팁을 공유하는 공간입니다. 풀이는 제외됩니다.'],
        ["3. If you'd like to share your solution for feedback and ideas, please head to the solutions tab and post it there.", '3. 풀이에 대한 피드백이나 아이디어를 받고 싶다면 풀이 탭에 올려주세요.'],
        ['Choose a type', '유형 선택'],
        ['Comment', '댓글'],
        ['Sort by', '정렬'],
        ['Best', '인기순'],
        ['Newest', '최신순'],
        ['Oldest', '오래된순'],
        ['Most Votes', '추천순'],
        ['No comments yet.', '아직 댓글이 없습니다.'],
        ['Register', '회원가입'],
        ['Log in', '로그인'],
        ['Premium', '프리미엄'],
        ['or', '또는'],
        ['Library', '라이브러리'],
        ['Quest', '퀘스트'],
        ['LeetCode Quest', 'LeetCode 퀘스트'],
        ['Turn practice into progress', '연습을 성장으로 이어가세요'],
        ['Data Structures and Algorithms', '자료구조와 알고리즘'],
        ['System & Software Design', '시스템 및 소프트웨어 설계'],
        ['Maths', '수학'],
        ['Array I', '배열 I'],
        ['Array II', '배열 II'],
        ['Unlocks after completing all levels above', '위의 모든 레벨을 완료하면 잠금 해제됩니다'],
        ['Clear this unit to unlock an advanced test!', '이 단원을 클리어하면 고급 테스트가 열립니다!'],
        ['Complete the units above to unlock.', '위 단원을 완료하면 잠금 해제됩니다.'],
        ['New', '새 항목'],
        ['Explore', '탐색'],
        ['Favorite', '즐겨찾기'],
        ['Welcome to', '환영합니다'],
        ['LeetCode Explore', 'LeetCode 탐색'],
        ['Featured', '추천 콘텐츠'],
        ['Learn', '학습'],
        ["LeetCode's Interview Crash Course", 'LeetCode 인터뷰 단기 코스'],
        ["LeetCode’s Interview Crash Course", 'LeetCode 인터뷰 단기 코스'],
        ['Detailed Explanation of', '자세히 배우는'],
        ['Introduction to Data Structure', '자료구조 입문'],
        ['Arrays 101', '배열 101'],
        ['SQL Language', 'SQL 언어'],
        ['Get Well Prepared for', '철저히 준비하는'],
        ['Google Interview', 'Google 인터뷰'],
        ['Top Questions from', '빈출 문제'],
        ['Crack the', '공략'],
        ['Apple Interview', 'Apple 인터뷰'],
        ['Graph', '그래프'],
        ['Heap', '힙'],
        ['Introduction to Algorithms', '알고리즘 입문'],
        ['Recursion I', '재귀 I'],
        ['Basic Concepts in ML', '머신러닝 기본 개념'],
        ['Machine Learning 101', '머신러닝 101'],
        ['Cheatsheets', '치트시트'],
        ['Locked', '잠김'],
        ['Data Structures and Algorithms', '자료구조와 알고리즘'],
        ['System Design for Interviews and Beyond', '인터뷰와 실무를 위한 시스템 설계'],
        ["The LeetCode Beginner's Guide", 'LeetCode 입문자 가이드'],
        ['Easy Collection', '쉬운 문제 모음'],
        ['Top Interview Questions', '인기 인터뷰 질문'],
        ['Chapter', '챕터'],
        ['Chapters', '챕터'],
        ['Item', '항목'],
        ['Items', '항목'],
        ['Study Plan', '학습 계획'],
        ['My Study Plan', '내 학습 계획'],
        ['Ongoing', '진행 중'],
        ["You don’t have the ongoing plan", '진행 중인 계획이 없습니다'],
        ["You don't have the ongoing plan", '진행 중인 계획이 없습니다'],
        ['Ace Coding Interview with 75 Qs', '75문제로 코딩 인터뷰 대비'],
        ['Top Interview 150', '인기 인터뷰 150'],
        ['Must-do List for Interview Prep', '인터뷰 준비 필수 목록'],
        ['8 Patterns, 42 Qs = Master BS', '8개 패턴, 42문제로 이분 탐색 마스터'],
        ['SQL 50', 'SQL 50'],
        ['Crack SQL Interview in 50 Qs', '50문제로 SQL 인터뷰 대비'],
        ['Introduction To', '입문'],
        ['Introduction to Pandas', 'Pandas 입문'],
        ['Learn Basic Pandas in 15 Qs', '15문제로 Pandas 기초 학습'],
        ['30 Days Challenge', '30일 챌린지'],
        ['30 Days of Pandas', 'Pandas 30일 챌린지'],
        ['Essential for pandas Interviews', 'Pandas 인터뷰 필수 과정'],
        ['30 Days of JavaScript', 'JavaScript 30일 챌린지'],
        ['Learn JS Basics with 30 Qs', '30문제로 JS 기초 학습'],
        ['Cracking Coding Interview', '코딩 인터뷰 공략'],
        ['Top 100 Liked', '좋아요 상위 100'],
        ['100 Best Rated Problems', '평점 높은 문제 100개'],
        ['Premium Algo 100', '프리미엄 알고리즘 100'],
        ['LeetCode Staff Pick', 'LeetCode 추천'],
        ['Advanced SQL 50', '고급 SQL 50'],
        ['50 Advanced SQL Problems', '고급 SQL 문제 50개'],
        ['Sprint Interview', '인터뷰 스프린트'],
        ["Amazon Spring '23 High Frequency", "Amazon 2023 봄 빈출"],
        ["Google Spring' 23 High Frequency", "Google 2023 봄 빈출"],
        ["TikTok Spring '23 High Frequency", "TikTok 2023 봄 빈출"],
        ["Apple Spring '23 High Frequency", "Apple 2023 봄 빈출"],
        ['Practice Amazon 25 Recently Asked Qs', '최근 출제된 Amazon 문제 25개 연습'],
        ['23 Recent Qs to Prepare Google Interview', 'Google 인터뷰 대비 최근 문제 23개'],
        ['Practice TikTok 21 Recently Asked Qs', '최근 출제된 TikTok 문제 21개 연습'],
        ['22 Apple Most Recent Asked Qs', 'Apple 최신 출제 문제 22개'],
        ['In-Depth Topics', '심화 주제'],
        ['Programming Skills', '프로그래밍 기술'],
        ['Excel Implementation Skills in 50 Qs', '50문제로 구현 실력 향상'],
        ['10 Essential DP Patterns', '필수 DP 패턴 10개'],
        ['Dynamic Programming Grandmaster', '동적 계획법 그랜드마스터'],
        ['Master DP with 8 Advanced Patterns', '8개 고급 패턴으로 DP 마스터'],
        ['Graph Theory', '그래프 이론'],
        ['Essential Graph Problems', '필수 그래프 문제'],
        ['Sign in', '로그인'],
        ['Sign In', '로그인'],
        ['Sign in to view lists and', '로그인하면 목록을 보고'],
        ['track study progress.', '학습 진행도를 추적할 수 있습니다.'],
        ['Sign in to start your journey', '로그인하고 여정을 시작하세요'],
        ['Saved', '저장됨'],
        ['Solved', '해결됨'],
        ['Streaks', '일 연속'],
        ['Ready to Practice?', '연습할 준비 되셨나요?'],
        ['Save as Smart List', '스마트 목록으로 저장'],
        ['My Lists', '내 목록'],
        ['Notebook', '노트북'],
        ['Progress', '진행도'],
        ['Points', '포인트'],
        ['Try New Features', '새 기능 체험'],
        ['Orders', '주문 내역'],
        ['My Playgrounds', '내 플레이그라운드'],
        ['Appearance', '화면 설정'],
        ['Your Points:', '내 포인트:'],
        ['Practice to earn more points. Redeem exciting rewards.', '문제를 풀고 포인트를 모아 특별한 보상으로 교환하세요.'],
        ['History', '내역'],
        ['A daily check-in', '일일 출석'],
        ['System Default', '시스템 기본값'],
        ['Light', '라이트'],
        ['Dark', '다크'],
        ['Sign Out', '로그아웃'],
        ['General', '일반'],
        ['Manage your basic profile information.', '기본 프로필 정보를 관리합니다.'],
        ['Display Name', '표시 이름'],
        ['Update Display Name', '표시 이름 수정'],
        ["Changing your display name won't change your username", '표시 이름을 변경해도 사용자 이름은 바뀌지 않습니다.'],
        ['Enter your display name', '표시 이름을 입력하세요'],
        ['Gender', '성별'],
        ['Update Your Gender', '성별 수정'],
        ['Select', '선택'],
        ['Male', '남성'],
        ['Female', '여성'],
        ['Non-Binary', '논바이너리'],
        ['Prefer not to say', '응답하지 않음'],
        ['Location', '위치'],
        ['Update Your Location', '위치 수정'],
        ['Country/Region', '국가/지역'],
        ['State/Province', '주/도'],
        ['City/Town', '시/군/구'],
        ['Birthday', '생일'],
        ['Update Your Birthday', '생일 수정'],
        ['Your birthday will be used to improve your experience on LeetCode.', '생일은 LeetCode 사용 경험을 개선하는 데 사용됩니다.'],
        ['Websites', '웹사이트'],
        ['Update Your Websites', '웹사이트 수정'],
        ['Add your websites to showcase your work.', '작업물을 보여줄 웹사이트를 추가하세요.'],
        ['Add', '추가'],
        ['Update Github', 'Github 수정'],
        ['Add your Github profile to display on your profile.', '프로필에 표시할 Github 프로필을 추가하세요.'],
        ['Your Github username or url', 'Github 사용자 이름 또는 URL'],
        ['Update LinkedIn', 'LinkedIn 수정'],
        ['Add your LinkedIn profile to display on your profile.', '프로필에 표시할 LinkedIn 프로필을 추가하세요.'],
        ['Your LinkedIn username or url', 'LinkedIn 사용자 이름 또는 URL'],
        ['Update X', 'X 수정'],
        ['Add your X profile to display on your profile.', '프로필에 표시할 X 프로필을 추가하세요.'],
        ['Your X username or url', 'X 사용자 이름 또는 URL'],
        ['Update ReadMe', 'ReadMe 수정'],
        ['Tell us about yourself (interests, experience, etc.)', '자기소개를 입력하세요 (관심사, 경험 등)'],
        ['Experience', '경험'],
        ['Share your growth from learning to career.', '학습부터 커리어까지의 성장 과정을 공유하세요.'],
        ['Work', '경력'],
        ['Add your work experience to your profile.', '프로필에 경력 정보를 추가하세요.'],
        ['Education', '학력'],
        ['Provide your education experience for your profile.', '프로필에 학력 정보를 추가하세요.'],
        ['Skills', '기술'],
        ['Skill', '기술'],
        ['Update your skills', '기술 수정'],
        ['Add or update your skills to reflect your latest experience.', '최근 경험을 반영해 기술을 추가하거나 수정하세요.'],
        ['Curate your profile', '프로필 공개 설정'],
        ['Control what opens to the public.', '공개할 항목을 관리합니다.'],
        ['Recent AC Problems and Submission Details', '최근 통과한 문제와 제출 상세'],
        ['Submission Heatmap', '제출 히트맵'],
        ['You can log in using your email, phone number, or LeetCode ID.', '이메일, 전화번호 또는 LeetCode ID로 로그인할 수 있습니다.'],
        ['Email', '이메일'],
        ['Phone Number', '전화번호'],
        ['Password', '비밀번호'],
        ['Not Set', '설정 안 됨'],
        ['Social Accounts', '소셜 계정'],
        ['Connect a social account to sign in to LeetCode.', '소셜 계정을 연결해 LeetCode에 로그인할 수 있습니다.'],
        ['Connect', '연결'],
        ['Disconnect', '연결 해제'],
        ['Danger Zone', '위험 구역'],
        ['Delete Account', '계정 삭제'],
        ['Daily Question', '오늘의 문제'],
        ['Weekly Premium', '주간 프리미엄'],
        ['Less than a day', '하루 미만'],
        ['Trending Companies', '인기 회사'],
        ['Extend Your Streak!', '연속 기록을 이어가세요!'],
        ['Access all features with our Premium subscription!', '프리미엄 구독으로 모든 기능을 이용하세요!'],
        ['Auto', '자동'],
        ['Source', '출처'],
        ['Case', '케이스'],
        ['Reset', '초기화'],
        ['Restart', '다시 시작'],
        ['Start', '시작'],
        ['Cancel', '취소'],
        ['Close', '닫기'],
        ['Expand', '펼치기'],
        ['Collapse', '접기'],
        ['Unfold', '펼치기'],
        ['Hide', '숨기기'],
        ['Settings', '설정'],
        ['Layouts', '레이아웃'],
        ['Format Code', '코드 정리'],
        ['Retrieve last submitted code', '마지막 제출 코드 가져오기'],
        ['Submission Notes', '제출 노트'],
        ['Reset to default code definition', '기본 코드 정의로 초기화'],
        ['Full screen', '전체 화면'],
        ['Exit full screen', '전체 화면 종료'],
        ['Maximize', '최대화'],
        ['Fold', '접기'],
        ['Unfold', '펼치기'],
        ['Upgrade to premium to use autocomplete', '자동완성을 사용하려면 프리미엄으로 업그레이드하세요'],
        ['Upgrade to premium to use debugger', '디버거를 사용하려면 프리미엄으로 업그레이드하세요'],
        ['Note', '노트'],
        ['Ask', '질문'],
        ['Ask Leet', 'Leet에게 질문'],
        ['Invite', '초대'],
        ['Use raw testcase editor', '원시 테스트케이스 편집기 사용'],
        ['How to Create Test Cases on LeetCode?', 'LeetCode 테스트 케이스 만드는 방법'],
        ['Feedback', '피드백'],
        ['Save', '저장'],
        ['Saving...', '저장 중...'],
        ['Ask Question', '질문하기'],
        ['Tip', '팁'],
        ['Practice Time!', '연습할 시간!'],
        ['LeetCoders studying this problem currently.', '현재 이 문제를 공부 중인 LeetCoder 수입니다.'],
        ['LeetCode Contest', 'LeetCode 대회'],
        ['Participate and win prizes.', '참여하고 상품을 받아보세요.'],
        ['Join Contest', '대회 참가'],
        ['Discuss Now', '지금 토론하기'],
        ['Share interview questions.', '인터뷰 질문을 공유하세요.'],
        ['Get solutions.', '풀이를 확인하세요.'],
        ["Let's Discuss", '토론하러 가기'],
        ['Shop with LeetCoins', 'LeetCoin으로 쇼핑하기'],
        ['Use your points in our LeetCode Store.', 'LeetCode 상점에서 포인트를 사용하세요.'],
        ['OO Design', '객체지향 설계'],
        ['Operating System', '운영체제'],
        ['Pick One', '무작위 선택'],
        ['All Topics', '전체 주제'],
        ['Algorithms', '알고리즘'],
        ['Database', '데이터베이스'],
        ['Shell', '셸'],
        ['Concurrency', '동시성'],
        ['String', '문자열'],
        ['Math', '수학'],
        ['Dynamic Programming', '동적 계획법'],
        ['Sorting', '정렬'],
        ['Greedy', '그리디'],
        ['Depth-First Search', '깊이 우선 탐색'],
        ['Binary Search', '이분 탐색'],
        ['Bit Manipulation', '비트 조작'],
        ['Matrix', '행렬'],
        ['Tree', '트리'],
        ['Breadth-First Search', '너비 우선 탐색'],
        ['Two Pointers', '투 포인터'],
        ['Prefix Sum', '누적 합'],
        ['Heap (Priority Queue)', '힙 (우선순위 큐)'],
        ['Simulation', '시뮬레이션'],
        ['Counting', '카운팅'],
        ['Graph Theory', '그래프 이론'],
        ['Binary Tree', '이진 트리'],
        ['Stack', '스택'],
        ['Sliding Window', '슬라이딩 윈도우'],
        ['Enumeration', '열거'],
        ['Design', '설계'],
        ['Backtracking', '백트래킹'],
        ['Union-Find', '유니온 파인드'],
        ['Number Theory', '정수론'],
        ['Linked List', '연결 리스트'],
        ['Ordered Set', '정렬된 집합'],
        ['Segment Tree', '세그먼트 트리'],
        ['Monotonic Stack', '단조 스택'],
        ['Divide and Conquer', '분할 정복'],
        ['Combinatorics', '조합론'],
        ['Trie', '트라이'],
        ['Bitmask', '비트마스크'],
        ['Queue', '큐'],
        ['Recursion', '재귀'],
        ['Geometry', '기하'],
        ['Binary Indexed Tree', '펜윅 트리'],
        ['Memoization', '메모이제이션'],
        ['Hash Function', '해시 함수'],
        ['Binary Search Tree', '이진 탐색 트리'],
        ['Topological Sort', '위상 정렬'],
        ['Shortest Path', '최단 경로'],
        ['String Matching', '문자열 매칭'],
        ['Rolling Hash', '롤링 해시'],
        ['Game Theory', '게임 이론'],
        ['Interactive', '인터랙티브'],
        ['Data Stream', '데이터 스트림'],
        ['Monotonic Queue', '단조 큐'],
        ['Brainteaser', '두뇌 퍼즐'],
        ['Doubly-Linked List', '이중 연결 리스트'],
        ['Merge Sort', '병합 정렬'],
        ['Randomized', '무작위화'],
        ['Counting Sort', '계수 정렬'],
        ['Iterator', '반복자'],
        ['Quickselect', '퀵셀렉트'],
        ['Suffix Array', '접미사 배열'],
        ['Sweep Line', '스위프 라인'],
        ['Probability and Statistics', '확률과 통계'],
        ['Minimum Spanning Tree', '최소 신장 트리'],
        ['Bucket Sort', '버킷 정렬'],
        ['Reservoir Sampling', '저수지 샘플링'],
        ['Eulerian Circuit', '오일러 경로'],
        ['Radix Sort', '기수 정렬'],
        ['Strongly Connected Component', '강한 연결 요소'],
        ['Rejection Sampling', '거절 샘플링'],
        ['Biconnected Component', '이중 연결 요소'],
        ['Download App', '앱 다운로드'],
        ['Help Center', '고객센터'],
        ['Bug Bounty', '버그 바운티'],
        ['Terms', '이용약관'],
        ['Privacy Policy', '개인정보 처리방침'],
        ['Support', '지원'],
        ['Rules', '규칙'],
        ['More', '더 보기'],
        ['United States', '미국'],
        ['Top 3 Contestants:', '상위 3명 참가자:'],
        ['Check out our', '확인해보세요:'],
        ['leaderboard', '리더보드'],
        ['Pick one', '무작위 선택'],
        ['Prev Question', '이전 문제'],
        ['Next Question', '다음 문제'],
        ['Expand Panel', '패널 펼치기'],
        ['Maximize tabset', '탭 영역 최대화'],
        ['Open in New Tab Problem List', '문제 목록 새 탭에서 열기'],
        ['Type comment here...', '댓글을 입력하세요...'],
        ['Enter Testcase', '테스트케이스 입력'],
        ['Search questions', '문제 검색'],
        ['Search for a company...', '회사 검색...'],
        ['Search...', '검색...'],
        ['Seen this question in a real interview before?', '실제 면접에서 이 문제를 본 적이 있나요?'],
        ['Yes', '예'],
        ['No', '아니오'],
        ['You need to', '먼저'],
        ['log in / sign up', '로그인 / 회원가입'],
        ['to run or submit', '해야 실행 또는 제출할 수 있습니다'],
        ['You need to log in / sign up to debug', '디버그하려면 로그인 / 회원가입이 필요합니다'],
        ['You must run your code first', '먼저 코드를 실행해야 합니다'],
        ['Junior', '입문'],
        ['Array', '배열'],
        ['Hash Table', '해시 테이블']
    ]);

    const ATTRIBUTE_TRANSLATIONS = new Map([
        ['Run', '실행'],
        ['Submit', '제출'],
        ['Search', '검색'],
        ['search', '검색'],
        ['搜索', '검색'],
        ['Daily Question', '오늘의 문제'],
        ['User Menu', '사용자 메뉴'],
        ['notification', '알림'],
        ['Stop Debug', '디버그 중지'],
        ['Skip forward', '앞으로 건너뛰기'],
        ['Step over', '다음 단계로'],
        ['Step in', '내부로 들어가기'],
        ['Step out', '밖으로 나가기'],
        ['Restart', '다시 시작'],
        ['Start', '시작'],
        ['Expand', '펼치기'],
        ['Collapse', '접기'],
        ['Unfold', '펼치기'],
        ['Approach', '접근 방식'],
        ['Efficiency', '효율성'],
        ['Code Style', '코드 스타일'],
        ['Reset', '초기화'],
        ['Stopwatch', '스톱워치'],
        ['Hide', '숨기기'],
        ['Settings', '설정'],
        ['Layouts', '레이아웃'],
        ['Format Code', '코드 정리'],
        ['Retrieve last submitted code', '마지막 제출 코드 가져오기'],
        ['Submission Notes', '제출 노트'],
        ['Reset to default code definition', '기본 코드 정의로 초기화'],
        ['Full screen', '전체 화면'],
        ['Exit full screen', '전체 화면 종료'],
        ['Maximize', '최대화'],
        ['Fold', '접기'],
        ['Unfold', '펼치기'],
        ['Upgrade to premium to use autocomplete', '자동완성을 사용하려면 프리미엄으로 업그레이드하세요'],
        ['Upgrade to premium to use debugger', '디버거를 사용하려면 프리미엄으로 업그레이드하세요'],
        ['Note', '노트'],
        ['Ask', '질문'],
        ['Ask Leet', 'Leet에게 질문'],
        ['Invite', '초대'],
        ['Use raw testcase editor', '원시 테스트케이스 편집기 사용'],
        ['How to Create Test Cases on LeetCode?', 'LeetCode 테스트 케이스 만드는 방법'],
        ['Feedback', '피드백'],
        ['Save', '저장'],
        ['Ask Question', '질문하기'],
        ['Tip', '팁'],
        ['Practice Time!', '연습할 시간!'],
        ['LeetCoders studying this problem currently.', '현재 이 문제를 공부 중인 LeetCoder 수입니다.'],
        ['Pick one', '무작위 선택'],
        ['Prev Question', '이전 문제'],
        ['Next Question', '다음 문제'],
        ['Expand Panel', '패널 펼치기'],
        ['Maximize tabset', '탭 영역 최대화'],
        ['Open in New Tab Problem List', '문제 목록 새 탭에서 열기'],
        ['Type comment here...', '댓글을 입력하세요...'],
        ['Enter Testcase', '테스트케이스 입력'],
        ['Search questions', '문제 검색'],
        ['Search for a company...', '회사 검색...'],
        ['Search...', '검색...'],
        ['Notifications (F8)', '알림 (F8)'],
        ['Prev', '이전'],
        ['Next', '다음'],
        ['You need to log in / sign up to debug', '디버그하려면 로그인 / 회원가입이 필요합니다'],
        ['prev', '이전'],
        ['next', '다음'],
        ['gap', '생략']
    ]);

    const PATTERN_TRANSLATIONS = [
        [/^Hint\s+(\d+)$/, '힌트 $1'],
        [/^Case\s+(\d+)$/, '케이스 $1'],
        [/^Example\s+(\d+):$/, '예제 $1:'],
        [/^Runtime:\s+(.+)$/, '실행 시간: $1'],
        [/^(\d+)\s+Analysis\s+Left$/, '분석 $1회 남음'],
        [/^Day\s+(\d+)$/, '$1일차'],
        [/^([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th),\s+(\d{4})$/, (_match, month, day, year) => {
            const monthMap = {
                January: '1월',
                February: '2월',
                March: '3월',
                April: '4월',
                May: '5월',
                June: '6월',
                July: '7월',
                August: '8월',
                September: '9월',
                October: '10월',
                November: '11월',
                December: '12월'
            };
            return `${year}년 ${monthMap[month] || month} ${Number(day)}일`;
        }],
        [/^([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})\s+(\d{2}:\d{2})$/, (_match, month, day, year, time) => {
            const monthMap = {
                January: '1월',
                February: '2월',
                March: '3월',
                April: '4월',
                May: '5월',
                June: '6월',
                July: '7월',
                August: '8월',
                September: '9월',
                October: '10월',
                November: '11월',
                December: '12월'
            };
            return `${year}년 ${monthMap[month] || month} ${Number(day)}일 ${time}`;
        }],
        [/^DCC\s+([A-Za-z]+)\s+(\d{4})$/, (_match, month, year) => {
            const monthMap = {
                January: '1월',
                February: '2월',
                March: '3월',
                April: '4월',
                May: '5월',
                June: '6월',
                July: '7월',
                August: '8월',
                September: '9월',
                October: '10월',
                November: '11월',
                December: '12월'
            };
            return `DCC ${year}년 ${monthMap[month] || month}`;
        }],
        [/^(\d+)\/(\d+)\s+Solved$/, '$1/$2 해결됨'],
        [/^(\d+)\s+Streaks$/, '$1일 연속'],
        [/^(\d+)\s+Levels$/, '$1개 레벨'],
        [/^(\d+)\s+Online$/, '$1명 온라인'],
        [/^Med\.$/, '보통'],
        [/^in\s+(\d+)\s+days?$/, '$1일 후'],
        [/^(\d+)\s+days?\s+ago$/, '$1일 전'],
        [/^an\s+hour\s+ago$/, '1시간 전'],
        [/^(\d+)\s+hours?\s+ago$/, '$1시간 전'],
        [/^a\s+minute\s+ago$/, '1분 전'],
        [/^(\d+)\s+minutes?\s+ago$/, '$1분 전'],
        [/^([\d.]+)%\s+of\s+solutions?\s+used\s+([\d.]+)\s*([A-Za-z]+)\s+of\s+(runtime|memory)\.?$/i, (_match, percent, amount, unit, metric) => {
            const metricText = metric.toLowerCase() === 'runtime' ? '실행 시간을' : '메모리를';
            return `풀이의 ${percent}%가 ${amount}${unit}의 ${metricText} 사용했습니다`;
        }],
        [/^Discussion\s*(\(.+\))$/, '토론 $1']
    ];

    const SKIP_TEXT_TAGS = new Set([
        'SCRIPT',
        'STYLE',
        'NOSCRIPT',
        'CODE',
        'PRE',
        'TEXTAREA',
        'INPUT',
        'OPTION',
        'SELECT'
    ]);

    const SKIP_ATTRIBUTE_TAGS = new Set([
        'SCRIPT',
        'STYLE',
        'NOSCRIPT',
        'CODE',
        'PRE',
        'OPTION',
        'SELECT'
    ]);

    function isInsideCodeEditor(element) {
        return Boolean(element?.closest('pre, code, .monaco-editor, .cm-editor, .CodeMirror, [class*="language-"]'));
    }

    function shouldSkipTextElement(element) {
        if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;
        if (SKIP_TEXT_TAGS.has(element.tagName)) return true;
        if (element.isContentEditable) return true;
        if (isInsideCodeEditor(element)) return true;
        return false;
    }

    function shouldSkipAttributeElement(element) {
        if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;
        if (SKIP_ATTRIBUTE_TAGS.has(element.tagName)) return true;
        if (isInsideCodeEditor(element)) return true;
        return false;
    }

    function ensureStyle() {
        if (document.getElementById(STYLE_ID)) return;

        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
            [data-peekle-strip-after]::after {
                content: '' !important;
            }
        `;
        document.documentElement.appendChild(style);
    }

    function translateValue(value) {
        const normalized = value.replace(/\s+/g, ' ').trim();
        if (!normalized) return null;

        const countdownMatch = normalized.match(/^(\d{1,2}):(\d{2}):(\d{2})\s+left$/i);
        if (countdownMatch) {
            const [, hours, minutes, seconds] = countdownMatch;
            return `${Number(hours)}시간 ${Number(minutes)}분 ${Number(seconds)}초 남음`;
        }

        const solutionMetricMatch = normalized.match(/^([\d.]+)%\s+of\s+solutions?\s+used\s+([\d.]+)\s*([A-Za-z]+)\s+of\s+(runtime|memory)\.?$/i);
        if (solutionMetricMatch) {
            const [, percent, amount, unit, metric] = solutionMetricMatch;
            const metricText = metric.toLowerCase() === 'runtime' ? '실행 시간을' : '메모리를';
            return `풀이의 ${percent}%가 ${amount}${unit}의 ${metricText} 사용했습니다`;
        }

        const exact = TEXT_TRANSLATIONS.get(normalized) || ATTRIBUTE_TRANSLATIONS.get(normalized);
        if (exact) return exact;

        for (const [pattern, replacement] of PATTERN_TRANSLATIONS) {
            if (pattern.test(normalized)) {
                return normalized.replace(pattern, replacement);
            }
        }

        return null;
    }

    function stripPluralSuffix(node) {
        const suffix = node.nextSibling;
        if (suffix?.nodeType !== Node.TEXT_NODE || suffix.nodeValue.trim() !== 's') return;

        if (!originalTextByNode.has(suffix)) {
            originalTextByNode.set(suffix, suffix.nodeValue);
        }

        suffix.nodeValue = '';
    }

    function translateTextNode(node) {
        if (!enabled) return;

        const parent = node.parentElement;
        if (shouldSkipTextElement(parent)) {
            if (originalTextByNode.has(node)) {
                node.nodeValue = originalTextByNode.get(node);
                originalTextByNode.delete(node);
            }
            return;
        }

        const original = node.nodeValue;
        const translated = translateValue(original);
        if (!translated || original.trim() === translated) return;

        if (!originalTextByNode.has(node)) {
            originalTextByNode.set(node, original);
        }

        if (['Chapter', 'Chapters', 'Item', 'Items'].includes(original.trim())) {
            parent?.setAttribute('data-peekle-strip-after', 'true');
        }

        const leading = original.match(/^\s*/)?.[0] || '';
        const trailing = original.match(/\s*$/)?.[0] || '';
        node.nodeValue = `${leading}${translated}${trailing}`;

        if (['Chapter', 'Item'].includes(original.trim())) {
            stripPluralSuffix(node);
        }
    }

    function translateAttributes(element) {
        if (!enabled) return;
        if (shouldSkipAttributeElement(element)) return;

        for (const attr of ['aria-label', 'title', 'placeholder', 'alt']) {
            const value = element.getAttribute(attr);
            if (!value) continue;

            const translated = translateValue(value);
            if (translated && value !== translated) {
                let originals = originalAttributesByElement.get(element);
                if (!originals) {
                    originals = new Map();
                    originalAttributesByElement.set(element, originals);
                }
                if (!originals.has(attr)) {
                    originals.set(attr, value);
                }

                element.setAttribute(attr, translated);
            }
        }
    }

    function localize(root) {
        if (!enabled) return;
        if (!root) return;

        if (root.nodeType === Node.TEXT_NODE) {
            translateTextNode(root);
            return;
        }

        if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE) return;

        if (root.nodeType === Node.ELEMENT_NODE) {
            translateAttributes(root);
        }

        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
            acceptNode(node) {
                return NodeFilter.FILTER_ACCEPT;
            }
        });

        while (walker.nextNode()) {
            translateTextNode(walker.currentNode);
        }

        if (root.querySelectorAll) {
        root.querySelectorAll('[aria-label], [title], [placeholder], [alt]').forEach(translateAttributes);
        }
    }

    let queued = false;
    function scheduleLocalize() {
        if (!enabled) return;
        if (queued) return;
        queued = true;

        window.requestAnimationFrame(() => {
            queued = false;
            localize(document.body);
        });
    }

    function scheduleDynamicLocalize() {
        scheduleLocalize();
        window.setTimeout(scheduleLocalize, 50);
        window.setTimeout(scheduleLocalize, 150);
    }

    function restoreOriginals(root) {
        if (!root) return;

        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
            const node = walker.currentNode;
            const original = originalTextByNode.get(node);
            if (original !== undefined) {
                node.nodeValue = original;
                originalTextByNode.delete(node);
            }
        }

        if (root.querySelectorAll) {
            root.querySelectorAll('*').forEach((element) => {
                element.removeAttribute('data-peekle-strip-after');

                const originals = originalAttributesByElement.get(element);
                if (!originals) return;

                originals.forEach((value, attr) => {
                    element.setAttribute(attr, value);
                });
                originalAttributesByElement.delete(element);
            });
        }
    }

    function setEnabled(nextEnabled) {
        if (enabled === nextEnabled) {
            if (enabled) scheduleLocalize();
            return;
        }

        enabled = nextEnabled;

        if (enabled) {
            ensureStyle();
            scheduleLocalize();
        } else {
            restoreOriginals(document.body);
        }
    }

    function readInitialSetting(callback) {
        if (!globalThis.chrome?.storage?.local) {
            callback(true);
            return;
        }

        chrome.storage.local.get([STORAGE_KEY], (result) => {
            callback(result[STORAGE_KEY] !== false);
        });
    }

    const observer = new MutationObserver((mutations) => {
        let shouldRun = false;

        for (const mutation of mutations) {
            if (!enabled) continue;

            if (mutation.type === 'characterData') {
                translateTextNode(mutation.target);
                continue;
            }

            if (mutation.type === 'attributes') {
                translateAttributes(mutation.target);
                continue;
            }

            if (mutation.addedNodes.length > 0) {
                shouldRun = true;
            }
        }

        if (shouldRun) scheduleLocalize();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ['aria-label', 'title', 'placeholder', 'alt']
    });

    readInitialSetting((initialEnabled) => {
        setEnabled(initialEnabled);
    });

    if (globalThis.chrome?.storage?.onChanged) {
        chrome.storage.onChanged.addListener((changes, area) => {
            if (area !== 'local' || !changes[STORAGE_KEY]) return;
            setEnabled(changes[STORAGE_KEY].newValue !== false);
        });
    }

    if (globalThis.chrome?.runtime?.onMessage) {
        chrome.runtime.onMessage.addListener((request) => {
            if (request?.type !== 'PEEKLE_LEETCODE_KOREAN_TOGGLE') return;
            setEnabled(request.enabled !== false);
        });
    }

    window.addEventListener('popstate', scheduleLocalize);
    document.addEventListener('pointerover', scheduleDynamicLocalize, true);
    document.addEventListener('focusin', scheduleDynamicLocalize, true);
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) scheduleLocalize();
    });

    console.log('[Peekle LeetCode] Korean localizer loaded.');
})();
