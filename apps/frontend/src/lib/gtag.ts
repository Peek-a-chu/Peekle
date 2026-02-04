export const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GA_ID;

// window.gtag 타입 정의
declare global {
  interface Window {
    gtag: (
      command: 'config' | 'event' | 'js',
      targetId: string | Date,
      config?: Record<string, any>
    ) => void;
  }
}

// PV 측정
export const pageview = (url: string) => {
  if (typeof window !== 'undefined' && window.gtag && GA_TRACKING_ID) {
    window.gtag('config', GA_TRACKING_ID, {
      page_path: url,
    });
  }
};

// GA 이벤트 타입 정의
type GTagEvent = {
  action: string;
  category: string;
  label: string;
  value?: number;
};

// 커스텀 이벤트 전송
export const event = ({ action, category, label, value }: GTagEvent) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  }
};

// --------------------------------------------------------------------------
// Peekle 서비스 전용 이벤트 헬퍼 함수들
// --------------------------------------------------------------------------

/**
 * 로그인 이벤트
 * @param method 로그인 방식 (예: 'github', 'kakao')
 */
export const logLogin = (method: string) => {
  event({
    action: 'login',
    category: 'auth',
    label: method,
  });
};

/**
 * 스터디방 입장 이벤트
 * @param roomId 방 ID
 * @param roomTitle 방 제목
 */
export const logStudyJoin = (roomId: string, roomTitle: string) => {
  event({
    action: 'join_room',
    category: 'study',
    label: roomTitle, // 식별하기 쉽도록 Title을 Label로 사용 (ID는 value에 넣거나 별도 속성 고려 가능하나 여기선 Label)
  });
};

/**
 * 코드 제출 이벤트
 * @param problemId 문제 번호
 * @param result 결과 (성공/실패)
 * @param mode 'study' | 'game'
 */
export const logCodeSubmit = (
  problemId: string | number,
  result: 'success' | 'fail',
  mode: 'study' | 'game'
) => {
  event({
    action: 'submit_code',
    category: mode,
    label: `problem-${problemId}`,
    value: result === 'success' ? 1 : 0,
  });
};

/**
 * 게임 시작 이벤트
 * @param gameId 게임 ID
 */
export const logGameStart = (gameId: string) => {
  event({
    action: 'game_start',
    category: 'game',
    label: gameId,
  });
};

/**
 * 게임 종료/완료 이벤트
 * @param gameId 게임 ID
 * @param rank 순위 (옵션)
 */
export const logGameFinish = (gameId: string, rank?: number) => {
  event({
    action: 'game_finish',
    category: 'game',
    label: gameId,
    value: rank,
  });
};
