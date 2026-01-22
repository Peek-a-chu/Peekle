# S4-3. 스터디 생성 (Frontend)

## 📌 Story Information

- **Epic**: Epic-04 (Study)
- **Story ID**: S4-3
- **Sprint**: TBD
- **Estimated Effort**: 0.5 day
- **Priority**: High
- **Dependencies**: S4-1
- **Status**: Ready

---

## 🧾 User Story

**As a** 사용자
**I want to** 새로운 스터디 방을 개설하고 싶다
**So that** 내가 원하는 주제로 지인들과 함께 공부할 공간을 만들기 위함이다

---

## ✅ Acceptance Criteria

1. **생성 모달**
   - "방 만들기" 버튼 클릭 시 생성 폼이 열려야 한다.

2. **입력 항목**
   - 방 제목과 설명을 입력할 수 있어야 한다. (정원 설정 없음)

3. **생성 후 이동**
   - 생성 완료 시 즉시 방에 참여 상태가 되며, 해당 방으로 입장해야 한다.

---

## 🛠 Implementation Tasks

- [ ] `CreateStudyModal` 컴포넌트 구현 (Title, Description Input)
- [ ] 스터디 생성 API 연동 (`POST /api/study`)
- [ ] 생성된 방의 초대 코드 생성 및 표시 로직 (방 내부에서)
