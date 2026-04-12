-- CS Learning MVP question seed (set 1)
-- Included domains: 1, 2, 3, 4, 8, 9
-- Excluded for later: 5(C), 6(Java), 7(Python)

-- =========================
-- 1) Questions
-- =========================
WITH stage_map AS (
    SELECT d.id AS domain_id, s.id AS stage_id, s.stage_no
    FROM cs_domains d
    JOIN cs_domain_tracks t
      ON t.domain_id = d.id
     AND t.track_no = 1
    JOIN cs_stages s
      ON s.track_id = t.id
),
question_seed AS (
    SELECT *
    FROM (VALUES
        -- Domain 1: 요구사항·분석·화면설계
        (10101, 1, 1,  'MULTIPLE_CHOICE', '쇼핑몰 사용자가 장바구니에 상품을 담을 수 있어야 한다.는 어떤 요구사항에 해당하는가?', '사용자가 수행할 수 있어야 하는 시스템 기능 자체를 설명하므로 기능 요구사항이다.'),
        (10102, 1, 2,  'OX', '와이어프레임은 일반적으로 화면의 구조와 배치를 검토하기 위한 산출물이며, 색상이나 실제 이미지 같은 시각 요소가 반드시 확정되어 있을 필요는 없다.', '와이어프레임은 보통 구조와 배치 중심의 화면 설계 산출물이며, 고충실도 시안이 아닐 수도 있다.'),
        (10103, 1, 3,  'MULTIPLE_CHOICE', '유스케이스 다이어그램의 주된 목적은 무엇인가?', '액터와 시스템 기능 간 상호작용을 표현하는 데 적합하다.'),
        (10104, 1, 4,  'SHORT_ANSWER', '화면 흐름과 배치를 빠르게 검토하기 위해 만드는 간단한 화면 설계 산출물을 무엇이라고 하는가?', '구조 중심의 초기 화면 설계 산출물이다.'),
        (10105, 1, 5,  'MULTIPLE_CHOICE', 'DFD(Data Flow Diagram)의 구성 요소가 아닌 것은?', '클래스는 객체지향 모델링 요소이며 DFD 구성 요소가 아니다.'),
        (10106, 1, 6,  'OX', '비기능 요구사항에는 성능, 보안, 가용성, 응답시간 같은 항목이 포함될 수 있다.', '시스템이 얼마나 잘 동작해야 하는지를 설명하는 항목들이다.'),
        (10107, 1, 7,  'SHORT_ANSWER', '동일한 입력과 출력을 사용하여 서로 다른 기능들이 모여 있는 경우의 응집도를 무엇이라고 하는가?', '번역에 따라 통신적 응집도 또는 교환적 응집도로 표현한다.'),
        (10108, 1, 8,  'MULTIPLE_CHOICE', '화면 설계 원칙으로 가장 부적절한 것은?', '과도한 정보 노출은 가독성과 사용성을 떨어뜨린다.'),
        (10109, 1, 9,  'SHORT_ANSWER', '사용자가 수행해야 할 시스템 기능 자체를 정의한 요구사항을 무엇이라고 하는가?', '요구사항 분류에서 기능 관점의 핵심 용어를 묻는 문제다.'),
        (10110, 1, 10, 'SHORT_ANSWER', '시스템이 얼마나 빠르고 안정적으로 동작해야 하는지를 정의한 요구사항을 무엇이라고 하는가?', '기능 자체가 아니라 품질 속성을 정의하는 요구사항 용어를 묻는다.'),

        -- Domain 2: 데이터 입출력·SQL 기초
        (10201, 2, 1,  'MULTIPLE_CHOICE', '집계 결과에 조건을 적용할 때 사용하는 절은?', 'GROUP BY 후 집계된 결과에 조건을 줄 때 HAVING을 사용한다.'),
        (10202, 2, 2,  'OX', 'SQL에서 NULL은 0과 같은 값으로 비교할 수 있다.', 'NULL은 값이 없음을 의미하며 = NULL이 아니라 IS NULL을 사용한다.'),
        (10203, 2, 3,  'MULTIPLE_CHOICE', '두 테이블을 조인할 때 조인 조건을 명시하는 데 가장 일반적으로 사용하는 것은?', 'JOIN ... ON ... 형태로 조인 조건을 명시한다.'),
        (10204, 2, 4,  'SHORT_ANSWER', 'SELECT 결과에서 중복 행을 제거하기 위해 사용하는 키워드는?', '중복 제거는 DISTINCT를 사용한다.'),
        (10205, 2, 5,  'MULTIPLE_CHOICE', 'INNER JOIN의 결과로 올바른 것은?', 'INNER JOIN은 조인 조건이 맞는 행만 반환한다.'),
        (10206, 2, 6,  'OX', 'COUNT(column_name)은 해당 컬럼의 NULL 값을 제외하고 개수를 센다.', 'NULL은 COUNT(column)에서 제외된다. COUNT(*)는 전체 행 수다.'),
        (10207, 2, 7,  'SHORT_ANSWER', '트랜잭션의 성질인 원자성, 일관성, 격리성, 지속성을 묶어서 무엇이라고 하는가?', '트랜잭션의 대표적인 4대 성질이다.'),
        (10208, 2, 8,  'MULTIPLE_CHOICE', '제3정규형(3NF)에 대한 설명으로 가장 적절한 것은?', '2NF는 부분 함수 종속 제거, 3NF는 이행 함수 종속 제거다.'),
        (10209, 2, 9,  'SHORT_ANSWER', 'GROUP BY로 집계된 결과에 조건을 적용할 때 사용하는 절은?', '집계 후 필터링 절을 묻는 문제다.'),
        (10210, 2, 10, 'SHORT_ANSWER', '주문이 없는 회원도 포함해 회원별 주문 건수를 조회하려면 어떤 조인을 사용해야 하는가?', '누락 없는 회원 집계를 위한 조인 방식을 묻는 문제다.'),

        -- Domain 3: 통합·인터페이스 구현
        (10301, 3, 1,  'MULTIPLE_CHOICE', 'REST API에서 일부 필드만 수정하는 요청에 가장 적절한 HTTP 메서드는?', '부분 수정은 PATCH가 가장 일반적이다.'),
        (10302, 3, 2,  'OX', 'JSON은 공식 문법상 주석(comment)을 지원한다.', '표준 JSON 문법은 주석을 허용하지 않는다.'),
        (10303, 3, 3,  'MULTIPLE_CHOICE', 'SOAP 기반 인터페이스에서 주로 사용하는 메시지 표현 형식은?', 'SOAP는 XML 기반 메시지 구조를 사용한다.'),
        (10304, 3, 4,  'SHORT_ANSWER', '동일한 요청을 여러 번 보내더라도 서버 상태가 한 번 보낸 것과 같은 성질을 무엇이라고 하는가?', '재시도 가능한 API 설계에서 중요한 개념이다.'),
        (10305, 3, 5,  'MULTIPLE_CHOICE', 'ESB(Enterprise Service Bus)의 역할로 가장 적절한 것은?', 'ESB는 시스템 간 연결, 라우팅, 변환 등에 사용된다.'),
        (10306, 3, 6,  'OX', 'HTTP 200 상태 코드는 일반적으로 요청이 정상 처리되었음을 의미한다.', '대표적인 성공 응답 코드다.'),
        (10307, 3, 7,  'SHORT_ANSWER', 'key-value 형태로 데이터를 표현하는 대표적인 경량 텍스트 데이터 교환 형식은?', '웹 API에서 가장 널리 사용되는 포맷이다.'),
        (10308, 3, 8,  'MULTIPLE_CHOICE', '외부 결제 API 장애가 길어질 때 내부 서비스로 장애가 전파되는 것을 줄이기 위한 패턴은?', '연쇄 장애를 줄이기 위해 서킷 브레이커를 사용한다.'),
        (10309, 3, 9,  'SHORT_ANSWER', 'REST API에서 리소스 조회에 일반적으로 사용하는 HTTP 메서드는 무엇인가?', '조회 전용 요청에서 가장 기본이 되는 메서드를 묻는 문제다.'),
        (10310, 3, 10, 'SHORT_ANSWER', '이벤트가 발생했을 때 서버가 등록된 URL로 즉시 알림을 보내는 방식은?', '폴링과 대비되는 푸시 기반 방식의 용어를 묻는 문제다.'),

        -- Domain 4: 프로그래밍 기본
        (10401, 4, 1,  'MULTIPLE_CHOICE', 'C 또는 Java에서 x = 3; y = x++; 수행 후 값으로 올바른 것은?', '후위 증가 연산이므로 먼저 기존 값이 대입되고, 그 다음 x가 증가한다.'),
        (10402, 4, 2,  'OX', '중첩 반복문 안에서 break를 실행하면 기본적으로 가장 가까운 반복문 하나만 종료된다.', '특별한 제어가 없다면 가장 안쪽 루프만 빠져나온다.'),
        (10403, 4, 3,  'MULTIPLE_CHOICE', '정렬된 배열에서 이진 탐색(Binary Search)의 시간 복잡도는?', '탐색 범위를 절반씩 줄인다.'),
        (10404, 4, 4,  'SHORT_ANSWER', '후입선출(LIFO) 방식으로 동작하는 자료구조는 무엇인가?', '마지막에 들어간 데이터가 먼저 나온다.'),
        (10405, 4, 5,  'MULTIPLE_CHOICE', '재귀 함수에서 반드시 필요한 요소로 가장 적절한 것은?', '종료 조건이 없으면 무한 재귀가 발생할 수 있다.'),
        (10406, 4, 6,  'OX', '많은 프로그래밍 언어에서 배열 인덱스는 0부터 시작한다.', '대표적으로 C, Java, Python 모두 0-based index를 사용한다.'),
        (10407, 4, 7,  'SHORT_ANSWER', '선입선출(FIFO) 방식으로 동작하는 자료구조는 무엇인가?', '먼저 들어간 데이터가 먼저 나온다.'),
        (10408, 4, 8,  'MULTIPLE_CHOICE', '다음 중 알고리즘 설계 기법이 아닌 것은?', '가비지 컬렉션은 메모리 관리 개념이다.'),
        (10409, 4, 9,  'SHORT_ANSWER', '반복 횟수가 명확할 때 일반적으로 더 적합한 반복문은?', '반복문 선택의 기본 기준을 묻는 문제다.'),
        (10410, 4, 10, 'SHORT_ANSWER', '함수가 자기 자신을 호출하는 방식은?', '재귀 개념의 핵심 용어를 묻는 문제다.'),

        -- Domain 8: 서버·보안·테스트
        (10801, 8, 1,  'MULTIPLE_CHOICE', 'HTTP 상태 코드 404의 의미는?', '대표적인 Not Found 상태 코드다.'),
        (10802, 8, 2,  'OX', '사용자 입력값을 문자열로 직접 이어 붙여 SQL을 만드는 방식은 SQL Injection 방어에 효과적이다.', '오히려 SQL Injection에 취약해진다. 바인딩을 사용해야 한다.'),
        (10803, 8, 3,  'MULTIPLE_CHOICE', '단위 테스트(Unit Test)의 대상으로 가장 적절한 것은?', '함수, 메서드, 클래스 수준의 작은 단위를 검증한다.'),
        (10804, 8, 4,  'SHORT_ANSWER', '사용자가 누구인지 확인하는 보안 절차를 무엇이라고 하는가?', '로그인과 신원 확인이 여기에 해당한다.'),
        (10805, 8, 5,  'MULTIPLE_CHOICE', '웹 페이지에 악성 스크립트를 삽입해 실행시키는 공격은?', 'Cross Site Scripting 공격이다.'),
        (10806, 8, 6,  'OX', 'HTTPS는 전송 구간 보호를 위해 TLS를 사용한다.', '평문 HTTP보다 보안이 강화된다.'),
        (10807, 8, 7,  'SHORT_ANSWER', '인증된 사용자가 어떤 자원에 접근할 권한이 있는지 판단하는 절차를 무엇이라고 하는가?', '역할(Role)이나 권한(Permission) 검증이 포함된다.'),
        (10808, 8, 8,  'MULTIPLE_CHOICE', '회귀 테스트(Regression Test)의 목적은?', '수정으로 인해 기존 동작이 깨지지 않았는지 확인한다.'),
        (10809, 8, 9,  'SHORT_ANSWER', 'SQL Injection을 방지하기 위해 사용자 입력값을 쿼리와 분리해 전달하는 기법을 무엇이라고 하는가?', '동적 SQL 문자열 결합 대신 사용하는 대표적인 방어 기법의 용어를 묻는 문제다.'),
        (10810, 8, 10, 'SHORT_ANSWER', '실제 사용자 흐름을 처음부터 끝까지 검증하는 테스트를 무엇이라고 하는가?', '테스트 수준 중 사용자 시나리오 전체 검증 용어를 묻는 문제다.'),

        -- Domain 9: 운영체제·네트워크·인프라·패키징
        (10901, 9, 1,  'MULTIPLE_CHOICE', '같은 프로세스 내 여러 스레드에 대한 설명으로 올바른 것은?', '같은 프로세스의 스레드는 자원을 공유한다.'),
        (10902, 9, 2,  'OX', 'UDP는 TCP처럼 전송 순서 보장과 재전송을 기본 제공한다.', 'UDP는 비연결형이며 신뢰성 보장을 기본 제공하지 않는다.'),
        (10903, 9, 3,  'MULTIPLE_CHOICE', 'DNS의 주된 역할은 무엇인가?', '사람이 읽기 쉬운 이름과 IP를 연결해 준다.'),
        (10904, 9, 4,  'SHORT_ANSWER', 'CPU가 현재 실행 중인 작업 상태를 저장하고 다른 작업으로 전환하는 과정을 무엇이라고 하는가?', '운영체제 스케줄링의 핵심 동작이다.'),
        (10905, 9, 5,  'MULTIPLE_CHOICE', 'TCP 3-way handshake의 두 번째 단계는 무엇인가?', '클라이언트가 SYN을 보내면 서버는 두 번째 단계에서 SYN+ACK를 보낸다.'),
        (10906, 9, 6,  'OX', 'Docker 이미지가 실행 중인 인스턴스이고, 컨테이너가 불변 템플릿이다.', '이미지는 실행을 위한 불변 템플릿이고, 컨테이너는 그 이미지를 실행한 인스턴스다.'),
        (10907, 9, 7,  'SHORT_ANSWER', '애플리케이션과 실행에 필요한 환경을 함께 묶어 어디서나 같은 방식으로 실행되게 하는 기술을 무엇이라고 하는가?', '배포 일관성을 높이는 핵심 개념이다.'),
        (10908, 9, 8,  'MULTIPLE_CHOICE', '로드 밸런서의 주된 역할은?', '가용성과 확장성을 높이기 위해 사용한다.'),
        (10909, 9, 9,  'SHORT_ANSWER', '같은 프로세스의 자원을 공유하며 실행되는 단위를 무엇이라고 하는가?', '프로세스 내부 실행 단위의 핵심 용어를 묻는 문제다.'),
        (10910, 9, 10, 'SHORT_ANSWER', '도메인 이름을 IP 주소로 변환해 주는 시스템을 무엇이라고 하는가?', '네트워크에서 이름 해석을 담당하는 핵심 시스템 용어를 묻는 문제다.')
    ) AS v(id, domain_id, stage_no, question_type, prompt, explanation)
)
INSERT INTO cs_questions (id, stage_id, question_type, prompt, explanation, is_active)
SELECT
    q.id,
    sm.stage_id,
    q.question_type,
    q.prompt,
    q.explanation,
    TRUE
FROM question_seed q
JOIN stage_map sm
  ON sm.domain_id = q.domain_id
 AND sm.stage_no = 1
ON CONFLICT (id) DO UPDATE
SET stage_id = EXCLUDED.stage_id,
    question_type = EXCLUDED.question_type,
    prompt = EXCLUDED.prompt,
    explanation = EXCLUDED.explanation,
    is_active = EXCLUDED.is_active;

-- =========================
-- 2) Choices (MULTIPLE_CHOICE, OX)
-- =========================
INSERT INTO cs_question_choices (question_id, choice_no, content, is_answer)
VALUES
    -- Domain 1
    (10101, 1, '비기능 요구사항', FALSE), (10101, 2, '기능 요구사항', TRUE), (10101, 3, '품질 요구사항', FALSE), (10101, 4, '제약 요구사항', FALSE),
    (10102, 1, 'O', TRUE), (10102, 2, 'X', FALSE),
    (10103, 1, '데이터베이스 정규화', FALSE), (10103, 2, '사용자와 시스템 간 상호작용 표현', TRUE), (10103, 3, '소스 코드 최적화', FALSE), (10103, 4, '서버 배포 구조 설계', FALSE),
    (10105, 1, '프로세스', FALSE), (10105, 2, '데이터 흐름', FALSE), (10105, 3, '데이터 저장소', FALSE), (10105, 4, '클래스', TRUE),
    (10106, 1, 'O', TRUE), (10106, 2, 'X', FALSE),
    (10108, 1, '일관성 유지', FALSE), (10108, 2, '사용자 중심 설계', FALSE), (10108, 3, '중요 기능 우선 배치', FALSE), (10108, 4, '가능한 많은 기능을 한 화면에 모두 노출', TRUE),

    -- Domain 2
    (10201, 1, 'WHERE', FALSE), (10201, 2, 'ORDER BY', FALSE), (10201, 3, 'HAVING', TRUE), (10201, 4, 'DISTINCT', FALSE),
    (10202, 1, 'O', FALSE), (10202, 2, 'X', TRUE),
    (10203, 1, 'GROUP BY', FALSE), (10203, 2, 'ON', TRUE), (10203, 3, 'HAVING', FALSE), (10203, 4, 'LIMIT', FALSE),
    (10205, 1, '왼쪽 테이블 전체', FALSE), (10205, 2, '양쪽 테이블에서 조건이 일치하는 행만', TRUE), (10205, 3, '오른쪽 테이블 전체', FALSE), (10205, 4, '양쪽 전체를 무조건 결합', FALSE),
    (10206, 1, 'O', TRUE), (10206, 2, 'X', FALSE),
    (10208, 1, '중복 컬럼 제거', FALSE), (10208, 2, '부분 함수 종속 제거', FALSE), (10208, 3, '이행 함수 종속 제거', TRUE), (10208, 4, '모든 키를 후보키로 만듦', FALSE),

    -- Domain 3
    (10301, 1, 'GET', FALSE), (10301, 2, 'POST', FALSE), (10301, 3, 'PUT', FALSE), (10301, 4, 'PATCH', TRUE),
    (10302, 1, 'O', FALSE), (10302, 2, 'X', TRUE),
    (10303, 1, 'CSV', FALSE), (10303, 2, 'XML', TRUE), (10303, 3, 'YAML', FALSE), (10303, 4, '바이너리 전용 포맷만 사용', FALSE),
    (10305, 1, 'UI 디자인 자동 생성', FALSE), (10305, 2, '시스템 간 메시지 중재 및 변환', TRUE), (10305, 3, '데이터베이스 정규화', FALSE), (10305, 4, '소스 코드 컴파일', FALSE),
    (10306, 1, 'O', TRUE), (10306, 2, 'X', FALSE),
    (10308, 1, '무한 재시도', FALSE), (10308, 2, '동기 호출만 사용', FALSE), (10308, 3, '서킷 브레이커', TRUE), (10308, 4, '타임아웃 제거', FALSE),

    -- Domain 4
    (10401, 1, 'x=3, y=4', FALSE), (10401, 2, 'x=4, y=3', TRUE), (10401, 3, 'x=4, y=4', FALSE), (10401, 4, 'x=3, y=3', FALSE),
    (10402, 1, 'O', TRUE), (10402, 2, 'X', FALSE),
    (10403, 1, 'O(1)', FALSE), (10403, 2, 'O(log n)', TRUE), (10403, 3, 'O(n)', FALSE), (10403, 4, 'O(n log n)', FALSE),
    (10405, 1, '전역 변수', FALSE), (10405, 2, '종료 조건', TRUE), (10405, 3, '배열 선언', FALSE), (10405, 4, '예외 처리', FALSE),
    (10406, 1, 'O', TRUE), (10406, 2, 'X', FALSE),
    (10408, 1, '분할 정복', FALSE), (10408, 2, '동적 계획법', FALSE), (10408, 3, '탐욕 기법', FALSE), (10408, 4, '가비지 컬렉션', TRUE),

    -- Domain 8
    (10801, 1, '요청 성공', FALSE), (10801, 2, '인증 필요', FALSE), (10801, 3, '서버 내부 오류', FALSE), (10801, 4, '요청한 자원을 찾을 수 없음', TRUE),
    (10802, 1, 'O', FALSE), (10802, 2, 'X', TRUE),
    (10803, 1, '전체 서비스 배포 환경', FALSE), (10803, 2, '가장 작은 실행 단위', TRUE), (10803, 3, '전체 사용자 시나리오', FALSE), (10803, 4, '운영 모니터링 시스템', FALSE),
    (10805, 1, 'CSRF', FALSE), (10805, 2, 'XSS', TRUE), (10805, 3, 'SQL Injection', FALSE), (10805, 4, 'Port Scan', FALSE),
    (10806, 1, 'O', TRUE), (10806, 2, 'X', FALSE),
    (10808, 1, '새 기능만 단독 확인', FALSE), (10808, 2, '기존 기능이 변경 후에도 정상 동작하는지 확인', TRUE), (10808, 3, '서버 성능 측정만 수행', FALSE), (10808, 4, 'UI 색상 검증만 수행', FALSE),

    -- Domain 9
    (10901, 1, '서로 완전히 독립된 주소 공간을 가진다', FALSE), (10901, 2, '코드, 힙 같은 자원을 공유할 수 있다', TRUE), (10901, 3, '반드시 서로 다른 프로그램이어야 한다', FALSE), (10901, 4, '컨텍스트 스위칭이 프로세스보다 항상 더 무겁다', FALSE),
    (10902, 1, 'O', FALSE), (10902, 2, 'X', TRUE),
    (10903, 1, '파일 압축', FALSE), (10903, 2, '도메인 이름을 IP 주소로 변환', TRUE), (10903, 3, '패킷 암호화', FALSE), (10903, 4, 'CPU 스케줄링', FALSE),
    (10905, 1, 'ACK', FALSE), (10905, 2, 'FIN', FALSE), (10905, 3, 'SYN+ACK', TRUE), (10905, 4, 'RST', FALSE),
    (10906, 1, 'O', FALSE), (10906, 2, 'X', TRUE),
    (10908, 1, '소스 코드 컴파일', FALSE), (10908, 2, '트래픽을 여러 서버에 분산', TRUE), (10908, 3, '도메인 등록 대행', FALSE), (10908, 4, '데이터베이스 정규화', FALSE)
ON CONFLICT (question_id, choice_no) DO UPDATE
SET content = EXCLUDED.content,
    is_answer = EXCLUDED.is_answer;

-- =========================
-- 3) Short answers
-- =========================
INSERT INTO cs_question_short_answers (question_id, answer_text, normalized_answer, is_primary)
VALUES
    (10104, '와이어프레임', '와이어프레임', TRUE),
    (10104, 'wireframe', 'wireframe', FALSE),
    (10107, '통신적 응집도', '통신적응집도', TRUE),
    (10107, '교환적 응집도', '교환적응집도', FALSE),

    (10204, 'DISTINCT', 'distinct', TRUE),
    (10207, 'ACID', 'acid', TRUE),

    (10304, '멱등성', '멱등성', TRUE),
    (10304, 'idempotency', 'idempotency', FALSE),
    (10307, 'JSON', 'json', TRUE),

    (10404, '스택', '스택', TRUE),
    (10404, 'stack', 'stack', FALSE),
    (10407, '큐', '큐', TRUE),
    (10407, 'queue', 'queue', FALSE),

    (10804, '인증', '인증', TRUE),
    (10804, 'authentication', 'authentication', FALSE),
    (10807, '인가', '인가', TRUE),
    (10807, 'authorization', 'authorization', FALSE),

    (10904, '컨텍스트 스위칭', '컨텍스트스위칭', TRUE),
    (10904, 'context switch', 'contextswitch', FALSE),
    (10904, 'context switching', 'contextswitching', FALSE),
    (10907, '컨테이너', '컨테이너', TRUE),
    (10907, '컨테이너화', '컨테이너화', FALSE),
    (10907, 'container', 'container', FALSE),
    (10907, 'containerization', 'containerization', FALSE),

    (10109, '기능 요구사항', '기능요구사항', TRUE),
    (10109, 'functional requirement', 'functionalrequirement', FALSE),
    (10110, '비기능 요구사항', '비기능요구사항', TRUE),
    (10110, 'non-functional requirement', 'nonfunctionalrequirement', FALSE),

    (10209, 'HAVING', 'having', TRUE),
    (10210, 'LEFT JOIN', 'leftjoin', TRUE),
    (10210, 'LEFT OUTER JOIN', 'leftouterjoin', FALSE),

    (10309, 'GET', 'get', TRUE),
    (10310, '웹훅', '웹훅', TRUE),
    (10310, 'webhook', 'webhook', FALSE),

    (10409, 'for문', 'for문', TRUE),
    (10409, 'for', 'for', FALSE),
    (10410, '재귀', '재귀', TRUE),
    (10410, '재귀호출', '재귀호출', FALSE),
    (10410, 'recursion', 'recursion', FALSE),

    (10809, '파라미터 바인딩', '파라미터바인딩', TRUE),
    (10809, 'prepared statement', 'preparedstatement', FALSE),
    (10810, 'E2E 테스트', 'e2e테스트', TRUE),
    (10810, 'e2e test', 'e2etest', FALSE),
    (10810, '종단간 테스트', '종단간테스트', FALSE),

    (10909, '스레드', '스레드', TRUE),
    (10909, 'thread', 'thread', FALSE),
    (10910, 'DNS', 'dns', TRUE),
    (10910, '도메인 네임 시스템', '도메인네임시스템', FALSE)
ON CONFLICT (question_id, normalized_answer) DO UPDATE
SET answer_text = EXCLUDED.answer_text,
    is_primary = EXCLUDED.is_primary;
