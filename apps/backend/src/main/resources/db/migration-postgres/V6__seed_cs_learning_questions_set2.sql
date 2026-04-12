-- CS Learning MVP question seed (set 2)
-- Included domains: 5(C), 6(Java), 7(Python)

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
        -- Domain 5: C 언어
        (10501, 5, 1,  'MULTIPLE_CHOICE',
            $$다음 C언어 코드의 출력값으로 알맞은 것은?

#include <stdio.h>

int main() {
    printf("%zu", sizeof(char));
    return 0;
}$$,
            $$일반적인 C 환경에서 char의 크기는 1바이트다.$$),
        (10502, 5, 2,  'SHORT_ANSWER',
            $$다음 C언어 코드의 빈칸에 들어갈 기호를 작성하시오.

#include <stdio.h>
#include <stdlib.h>

typedef struct Data {
    int num;
} Data;

int main() {
    Data *d = (Data *)malloc(sizeof(Data));
    d (   ) num = 10;
    printf("%d", d->num);
    free(d);
    return 0;
}$$,
            $$구조체 포인터의 멤버에 접근할 때는 ->를 사용한다.$$),
        (10503, 5, 3,  'MULTIPLE_CHOICE',
            $$다음 C언어 선언문의 의미로 가장 알맞은 것은?

int *p;$$,
            $$*는 포인터 선언을 의미한다.$$),
        (10504, 5, 4,  'SHORT_ANSWER',
            $$다음 C언어 코드에서 문자열의 끝을 나타내는 특수 문자를 작성하시오.

char s[] = "AB";$$,
            $$C 문자열의 끝에는 문자열 종료를 나타내는 \0이 자동으로 붙는다.$$),
        (10505, 5, 5,  'MULTIPLE_CHOICE',
            $$다음 C언어 코드의 빈칸에 들어갈 코드로 가장 알맞은 것은?

int x;
scanf("%d", (   ));$$,
            $$scanf는 입력값을 저장할 메모리 주소가 필요하므로 &x를 사용한다.$$),
        (10506, 5, 6,  'SHORT_ANSWER',
            $$다음 C언어 코드의 출력값을 작성하시오.

#include <stdio.h>

int f(int n) {
    if (n <= 1) return 1;
    return n * f(n - 1);
}

int main() {
    printf("%d", f(5));
    return 0;
}$$,
            $$5 * 4 * 3 * 2 * 1 이므로 120이다.$$),
        (10507, 5, 7,  'MULTIPLE_CHOICE',
            $$다음 C언어 코드의 출력 결과로 알맞은 것은?

#include <stdio.h>

int main() {
    char *p = "KOREA";
    printf("%s %c", p + 1, *(p + 3));
    return 0;
}$$,
            $$p + 1은 "OREA"를 가리키고, *(p + 3)은 E다.$$),
        (10508, 5, 8,  'SHORT_ANSWER',
            $$다음 C언어 코드의 출력값을 작성하시오.

#include <stdio.h>

int main() {
    int n[3] = {73, 95, 82};
    int i, sum = 0;

    for (i = 0; i < 3; i++) {
        sum += n[i];
    }

    switch (sum / 30) {
        case 10:
        case 9: printf("A");
        case 8: printf("B");
        case 7:
        case 6: printf("C");
        default: printf("D");
    }

    return 0;
}$$,
            $$합계는 250이고 250 / 30 = 8이다. break가 없으므로 B, C, D가 순서대로 출력된다.$$),
        (10509, 5, 9,  'MULTIPLE_CHOICE',
            $$다음 C언어 코드의 출력 결과로 알맞은 것은?

#include <stdio.h>

int main() {
    int a[3] = {10, 20, 30};
    int *p = a;

    printf("%d %d", *(p + 1), a[2]);
    return 0;
}$$,
            $$*(p + 1)은 두 번째 원소 20이고, a[2]는 30이다.$$),
        (10510, 5, 10, 'SHORT_ANSWER',
            $$다음 C언어 코드의 빈칸에 들어갈 알맞은 코드를 작성하시오.

#include <stdio.h>
#include <stdlib.h>

int main() {
    int *p = (int *)malloc(sizeof(int));
    *p = 100;
    printf("%d\n", *p);
    ________
    return 0;
}

조건: 동적으로 할당한 메모리를 해제한다.$$,
            $$malloc()으로 할당한 메모리는 사용 후 free()로 해제해야 한다.$$),

        -- Domain 6: 자바
        (10601, 6, 1,  'MULTIPLE_CHOICE',
            $$다음 자바 코드의 출력 결과로 알맞은 것은?

public class Main {
    public static void main(String[] args) {
        String s = "AB";
        s.concat("C");
        System.out.print(s);
    }
}$$,
            $$String은 불변 객체이므로 concat()만 호출해서는 원본이 바뀌지 않는다.$$),
        (10602, 6, 2,  'SHORT_ANSWER',
            $$다음 자바 코드의 빈칸에 들어갈 키워드를 작성하시오.

interface A {}
interface B {}

class C ______ A, B {
}$$,
            $$자바는 클래스 다중 상속은 지원하지 않지만, 여러 인터페이스를 구현할 수 있다.$$),
        (10603, 6, 3,  'MULTIPLE_CHOICE',
            $$다음 자바 코드의 출력 결과로 알맞은 것은?

class Parent {
    void show() {
        System.out.print("Parent");
    }
}

class Child extends Parent {
    @Override
    void show() {
        System.out.print("Child");
    }
}

public class Main {
    public static void main(String[] args) {
        Parent p = new Child();
        p.show();
    }
}$$,
            $$실제 객체가 Child이므로 오버라이딩된 메서드가 호출된다.$$),
        (10604, 6, 4,  'SHORT_ANSWER',
            $$다음 자바 코드에서 Integer, Double과 같이 기본형 값을 객체처럼 다룰 수 있게 해 주는 클래스의 공통 이름을 작성하시오.

Integer a = 10;
Double b = 3.14;$$,
            $$기본형 값을 객체로 다루기 위해 제공되는 클래스다.$$),
        (10605, 6, 5,  'MULTIPLE_CHOICE',
            $$다음 자바 코드가 컴파일 오류가 발생하는 이유로 가장 알맞은 것은?

class A {
    private int n = 10;
}

public class Main {
    public static void main(String[] args) {
        A a = new A();
        System.out.print(a.n);
    }
}$$,
            $$private 멤버는 선언된 클래스 내부에서만 접근할 수 있다.$$),
        (10606, 6, 6,  'SHORT_ANSWER',
            $$다음 자바 코드에서 Parent p = new Child(); 와 같은 문법을 무엇이라고 하는지 작성하시오.

class Parent {}
class Child extends Parent {}

public class Main {
    public static void main(String[] args) {
        Parent p = new Child();
    }
}$$,
            $$부모 타입 참조 변수로 자식 객체를 참조하는 것이다.$$),
        (10607, 6, 7,  'MULTIPLE_CHOICE',
            $$다음 중 중복 저장이 가능하고 입력 순서를 유지하는 컬렉션으로 가장 적절한 것은?$$,
            $$ArrayList는 입력 순서를 유지하고 중복을 허용한다.$$),
        (10608, 6, 8,  'SHORT_ANSWER',
            $$다음 자바 코드의 빈칸에 들어갈 메서드 이름을 작성하시오.

String a = new String("abc");
String b = new String("abc");

System.out.print(a.______(b));

조건: 문자열의 내용을 비교하여 true가 출력되도록 한다.$$,
            $$문자열 내용 비교에는 ==가 아니라 equals()를 사용한다.$$),
        (10609, 6, 9,  'MULTIPLE_CHOICE',
            $$다음 자바 코드의 출력 결과로 알맞은 것은?

interface A {
    default void show() {
        System.out.print("A");
    }
}

class B implements A {
}

public class Main {
    public static void main(String[] args) {
        B b = new B();
        b.show();
    }
}$$,
            $$자바의 인터페이스는 default 메서드를 가질 수 있다.$$),
        (10610, 6, 10, 'SHORT_ANSWER',
            $$다음 자바 코드의 빈칸에 들어갈 메서드 이름을 작성하시오.

class User {
    String id;

    @Override
    public boolean equals(Object obj) {
        return true;
    }

    @Override
    public int ______() {
        return 1;
    }
}

조건: HashSet, HashMap 같은 해시 기반 컬렉션에서 동작 일관성을 맞추기 위해 equals()와 함께 재정의해야 하는 메서드 이름을 작성한다.$$,
            $$equals()를 재정의하면 hashCode()도 함께 재정의해야 한다.$$),

        -- Domain 7: 파이썬
        (10701, 7, 1,  'MULTIPLE_CHOICE',
            $$다음 파이썬 코드에서 오류가 발생하는 이유로 가장 적절한 것은?

a = (1, 2, 3)
a[0] = 10$$,
            $$tuple은 생성 후 원소를 변경할 수 없는 자료형이다.$$),
        (10702, 7, 2,  'SHORT_ANSWER',
            $$다음 파이썬 코드에서 if 문 아래의 실행 블록을 구분하는 문법 요소를 작성하시오.

if True:
    print("A")$$,
            $$파이썬은 중괄호 대신 들여쓰기로 코드 블록을 구분한다.$$),
        (10703, 7, 3,  'MULTIPLE_CHOICE',
            $$다음 파이썬 코드의 실행 결과로 알맞은 것은?

print([x * x for x in range(3)])$$,
            $$range(3)은 0, 1, 2이므로 결과는 [0, 1, 4]이다.$$),
        (10704, 7, 4,  'SHORT_ANSWER',
            $$다음 파이썬 코드에서 사용된 자료형의 이름을 작성하시오.

data = {1, 2, 2, 3}

조건: 중복을 허용하지 않는 내장 자료형이다.$$,
            $$set은 중복을 허용하지 않는 자료형이다.$$),
        (10705, 7, 5,  'MULTIPLE_CHOICE',
            $$다음 파이썬 코드와 같이 키-값 쌍으로 데이터를 저장하는 자료형으로 알맞은 것은?

data = {"name": "Kim", "age": 20}$$,
            $$파이썬에서 키-값 쌍을 저장하는 자료형은 dict다.$$),
        (10706, 7, 6,  'SHORT_ANSWER',
            $$다음 파이썬 코드의 빈칸에 들어갈 키워드를 작성하시오.

f = ______ x: x + 1$$,
            $$이름 없는 간단한 함수를 만들 때 사용하는 키워드다.$$),
        (10707, 7, 7,  'MULTIPLE_CHOICE',
            $$다음 파이썬 코드의 실행 결과로 알맞은 것은?

a = [1, 2, 3]
b = a
b[0] = 100

print(a[0])$$,
            $$b = a는 같은 리스트를 참조하므로 b를 수정하면 a도 함께 바뀐다.$$),
        (10708, 7, 8,  'SHORT_ANSWER',
            $$다음 파이썬 코드의 빈칸에 들어갈 알맞은 코드를 작성하시오.

import copy

a = [[1, 2], [3, 4]]
b = __________

조건: b를 수정해도 a의 내부 리스트가 함께 바뀌지 않도록 한다.$$,
            $$중첩 리스트까지 완전히 독립 복사하려면 깊은 복사가 필요하다.$$),
        (10709, 7, 9,  'MULTIPLE_CHOICE',
            $$다음 파이썬 코드의 실행 결과로 알맞은 것은?

a = [1, 2, 3]
b = a[:]
b[0] = 100

print(a[0], b[0])$$,
            $$a[:]는 바깥 리스트를 새로 만드는 얕은 복사이므로 b[0]만 바뀐다.$$),
        (10710, 7, 10, 'SHORT_ANSWER',
            $$다음 파이썬 코드의 출력값을 작성하시오.

a = [[1, 2], [3, 4]]
b = a.copy()
b[0][0] = 99

print(a[0][0])$$,
            $$a.copy()는 얕은 복사이므로 내부 리스트는 공유된다. 따라서 b[0][0]을 바꾸면 a[0][0]도 함께 바뀐다.$$)
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
-- 2) Choices (MULTIPLE_CHOICE)
-- =========================
INSERT INTO cs_question_choices (question_id, choice_no, content, is_answer)
VALUES
    -- Domain 5
    (10501, 1, '1', TRUE), (10501, 2, '2', FALSE), (10501, 3, '4', FALSE), (10501, 4, '8', FALSE),
    (10503, 1, '정수형 변수 p', FALSE), (10503, 2, '정수형 값을 반환하는 함수 p', FALSE), (10503, 3, 'int형 데이터를 가리키는 포인터 p', TRUE), (10503, 4, '포인터를 가리키는 포인터 p', FALSE),
    (10505, 1, 'x', FALSE), (10505, 2, '*x', FALSE), (10505, 3, '&x', TRUE), (10505, 4, '&&x', FALSE),
    (10507, 1, 'KOREA K', FALSE), (10507, 2, 'OREA E', TRUE), (10507, 3, 'OREA O', FALSE), (10507, 4, 'KOREA E', FALSE),
    (10509, 1, '10 20', FALSE), (10509, 2, '20 30', TRUE), (10509, 3, '30 20', FALSE), (10509, 4, '10 30', FALSE),

    -- Domain 6
    (10601, 1, 'AB', TRUE), (10601, 2, 'ABC', FALSE), (10601, 3, 'C', FALSE), (10601, 4, '오류 발생', FALSE),
    (10603, 1, 'Parent', FALSE), (10603, 2, 'Child', TRUE), (10603, 3, 'ParentChild', FALSE), (10603, 4, '오류 발생', FALSE),
    (10605, 1, 'n이 static이 아니기 때문이다', FALSE), (10605, 2, 'n이 private이라 같은 클래스 내부에서만 접근 가능하기 때문이다', TRUE), (10605, 3, 'A가 추상 클래스이기 때문이다', FALSE), (10605, 4, 'Main 클래스에 생성자가 없기 때문이다', FALSE),
    (10607, 1, 'HashSet', FALSE), (10607, 2, 'HashMap', FALSE), (10607, 3, 'ArrayList', TRUE), (10607, 4, 'TreeSet', FALSE),
    (10609, 1, 'A', TRUE), (10609, 2, 'B', FALSE), (10609, 3, '오류 발생', FALSE), (10609, 4, '아무것도 출력되지 않음', FALSE),

    -- Domain 7
    (10701, 1, 'list는 immutable하기 때문이다', FALSE), (10701, 2, 'tuple은 immutable하기 때문이다', TRUE), (10701, 3, 'dict는 인덱스를 사용할 수 없기 때문이다', FALSE), (10701, 4, 'set은 대입 연산을 지원하지 않기 때문이다', FALSE),
    (10703, 1, '[1, 4, 9]', FALSE), (10703, 2, '[0, 1, 4]', TRUE), (10703, 3, '[0, 1, 2]', FALSE), (10703, 4, '(0, 1, 4)', FALSE),
    (10705, 1, 'list', FALSE), (10705, 2, 'tuple', FALSE), (10705, 3, 'dict', TRUE), (10705, 4, 'set', FALSE),
    (10707, 1, '1', FALSE), (10707, 2, '100', TRUE), (10707, 3, '[100, 2, 3]', FALSE), (10707, 4, '오류 발생', FALSE),
    (10709, 1, '1 100', TRUE), (10709, 2, '100 100', FALSE), (10709, 3, '1 1', FALSE), (10709, 4, '오류 발생', FALSE)
ON CONFLICT (question_id, choice_no) DO UPDATE
SET content = EXCLUDED.content,
    is_answer = EXCLUDED.is_answer;

-- =========================
-- 3) Short answers
-- =========================
INSERT INTO cs_question_short_answers (question_id, answer_text, normalized_answer, is_primary)
VALUES
    -- Domain 5
    (10502, '->', '->', TRUE),
    (10504, '\0', '\0', TRUE),
    (10504, '널 문자', '널문자', FALSE),
    (10504, 'null character', 'nullcharacter', FALSE),
    (10506, '120', '120', TRUE),
    (10508, 'BCD', 'bcd', TRUE),
    (10510, 'free(p);', 'free(p);', TRUE),

    -- Domain 6
    (10602, 'implements', 'implements', TRUE),
    (10604, '래퍼 클래스', '래퍼클래스', TRUE),
    (10604, 'wrapper class', 'wrapperclass', FALSE),
    (10606, '업캐스팅', '업캐스팅', TRUE),
    (10606, 'upcasting', 'upcasting', FALSE),
    (10608, 'equals', 'equals', TRUE),
    (10610, 'hashCode', 'hashcode', TRUE),

    -- Domain 7
    (10702, '들여쓰기', '들여쓰기', TRUE),
    (10702, 'indentation', 'indentation', FALSE),
    (10704, 'set', 'set', TRUE),
    (10704, '셋', '셋', FALSE),
    (10704, '집합', '집합', FALSE),
    (10706, 'lambda', 'lambda', TRUE),
    (10706, '람다', '람다', FALSE),
    (10708, 'copy.deepcopy(a)', 'copy.deepcopy(a)', TRUE),
    (10710, '99', '99', TRUE)
ON CONFLICT (question_id, normalized_answer) DO UPDATE
SET answer_text = EXCLUDED.answer_text,
    is_primary = EXCLUDED.is_primary;
