# S4-2. 스터디 참여 (코드 입력) (Frontend)

## 📌 Story Information

- **Epic**: Epic-04 (Study)
- **Story ID**: S4-2
- **Sprint**: TBD
- **Estimated Effort**: 0.5 day
- **Priority**: High
- **Dependencies**: S4-1
- **Status**: Ready

---

## 🧾 User Story

**As a** 사용자
**I want to** 초대 코드를 입력하여 새로운 스터디에 합류하고 싶다
**So that** 지인이나 커뮤니티를 통해 공유받은 비공개 스터디에 참여하기 위함이다

---

## ✅ Acceptance Criteria

1. **참여 모달**
   - "참여하기" 버튼 클릭 시 6자리(또는 UUID) 초대 코드 입력 모달이 열려야 한다.

2. **유효성 검사**
   - 코드 입력 후 확인 시 서버에서 방 존재 여부를 확인한다. (정원 제한 없음)

3. **참여 완료**
   - 검증 성공 시 내 스터디 목록에 추가되고, 해당 스터디 메인으로 이동하거나 목록이 갱신되어야 한다.

---

## 🛠 Implementation Tasks

- [ ] `JoinStudyModal` 컴포넌트 구현
- [ ] 스터디 참여 API 연동 (`POST /api/study/join`)
- [ ] 에러 핸들링 (유효하지 않은 코드 등)
