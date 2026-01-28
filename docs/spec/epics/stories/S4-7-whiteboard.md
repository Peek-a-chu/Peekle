요청하신 대로 **UNDO(실행 취소) 기능을 완전히 제거**하고, **CURSOR(커서 공유) 기능을 완전히 제거**하며, **IDE Split 모드**로 변경된 최종 상세 명세서입니다.

---

# S4-7. 화이트보드 시스템 (IDE Split)

## 📌 Story Information

* **Epic**: Epic-04 (Study)
* **Story ID**: S4-7
* **Sprint**: TBD
* **Estimated Effort**: 3 days
* **Priority**: Medium
* **Dependencies**: Epic-03 (WebRTC)
* **Status**: Ready

---

## 🧾 User Story

**As a** 참여자
**I want to** 화이트보드를 열어 시각적으로 설명하고 싶다
**So that** 말로 설명하기 어려운 알고리즘이나 로직을 그림으로 공유하기 위함이다

---

## ✅ Acceptance Criteria

1. **미리보기 타일**
* 한 명이 화이트보드를 오픈하면, 비디오 그리드 왼쪽(첫 번째 타일)에 [미리보기 화면]이 생겨야 한다.

2. **IDE Split 영역 및 동기화**
* 미리보기 타일 클릭 시 IDE 영역에 [화이트보드 패널]이 Split View로 열리고, 모든 참여자에게 드로잉이 실시간 동기화되어야 한다.

3. **알림**
* 누군가 화이트보드를 시작하면 모든 참여자의 화면 우측 하단에 알림(Toast)이 떠야 한다.

---

## 🎨 UI Specification

### 참조 와이어프레임

* [화이트보드 활성화 화면](https://www.google.com/search?q=../../../pics/%EC%8A%A4%ED%84%B0%EB%94%94%EB%B0%A9%2520%ED%99%94%EC%9D%B4%ED%8A%B8%EB%B3%B4%EB%93%9C.svg)

### 화이트보드 활성화 흐름

1. **타일 활성화 트리거**: 하단 Control Bar의 ✏️ 버튼 클릭 → VideoGrid에 화이트보드 타일 ON/OFF
2. **알림**: 화면 우측 하단에 **Toast 알림** 메시지 표시 (다른 참여자에게)
3. **미리보기 타일**: 비디오 그리드 첫 번째에 화이트보드 미리보기 추가
4. **IDE Split 표시**: 미리보기 타일 클릭 시 IDE 영역에 화이트보드 패널이 Split View로 표시

### 버튼 동작 상세

```text
[Control Bar의 ✏️ 버튼 클릭]
        │
        ▼
┌─────────────────────────────────────┐
│ VideoGrid에 화이트보드 타일 ON/OFF  │
│ (isWhiteboardActive 토글)           │
│ + 다른 참여자에게 Toast 알림 표시   │
└─────────────────────────────────────┘
        │
        ▼
[화이트보드 타일 클릭]
        │
        ▼
┌─────────────────────────────────────┐
│ IDE 영역에 화이트보드 Split View    │
│ (isWhiteboardOverlayOpen 토글)      │
└─────────────────────────────────────┘
```

### 비디오 그리드 - 화이트보드 타일

```text
┌─────────────────────────────────────────────────────────────────┐
│ [화이트보드] [나(L)]  [참여자1]  [참여자2]  [...]               │
│    (NEW!)                                                       │
└─────────────────────────────────────────────────────────────────┘

```

### Toast 알림 메시지 (우측 하단)

```text
(화면 전체 기준 우측 하단)
                                     ┌──────────────────────────────────┐
                                     │ 🔔 알림                          │
                                     │ Kim님이 화이트보드를 활성화      │
                                     │ 했습니다. 참여해보세요!          │
                                     └──────────────────────────────────┘

```

* **위치**: 화면 우측 하단 (Bottom-Right)
* **동작**: 화이트보드 `START` 이벤트 수신 시 3~5초간 노출 후 자동 사라짐
* **클릭**: Toast 클릭 시 화이트보드 Split View 즉시 오픈

### 화이트보드 패널 (IDE Split View)

**기존 모달 방식에서 IDE Split View 방식으로 변경됨**

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                              IDE 영역                                       │
├────────────────────────────────────┬────────────────────────────────────────┤
│         내 코드 에디터              │           화이트보드 Canvas            │
│                                    │                                        │
│    function solution() {           │          [손글씨/그림]                 │
│      // 내 코드                    │             메 롱                      │
│    }                               │                                        │
│                                    ├────────────────────────────────────────┤
│                                    │ [✏️ 펜] [🔲 도형] [T 텍스트] [🗑 지우개] │
│                                    │                              [X 닫기] │
└────────────────────────────────────┴────────────────────────────────────────┘
```

### 화이트보드 도구 상세

| 도구 | 기능 |
| --- | --- |
| **✏️ 펜** | 자유 드로잉 (색상, 굵기 선택 가능) |
| **🔲 도형** | 사각형, 원, 화살표 등 기본 도형 |
| **T 텍스트** | 텍스트 입력 |
| **🗑 지우개** | **객체 단위 삭제** (클릭 시 해당 요소 삭제) |
| **X 닫기** | 화이트보드 패널 닫기 (내 화면만 닫힘, Split View 종료) |

---

## 🔌 Technical Specification (API & WebSocket)

### 🛠 핵심 변경 사항

1. **Action 필드 도입:** `type` 대신 **`action`** 필드를 사용하여 동작을 구분
2. **객체 식별자 필수:** 개별 드로잉 객체의 식별 및 수정을 위해 **`objectId`** 필수 포함
3. **UNDO 제외:** 실행 취소 관련 로직 및 상태 관리는 포함하지 않음
4. **CURSOR 제외:** 커서 위치 공유 기능은 포함하지 않음

### Base URL Pattern

`/topic/studies/rooms/{id}/whiteboard`

### Protocol Specification

| 기능 (Description) | Type | Destination (URL) | Request Payload / Response Example (JSON) |
| --- | --- | --- | --- |
| **그리기/이벤트 전송**<br><br>(Client → Server) | **PUB** | `/pub/studies/whiteboard/message` | `json { "action": "ADDED", "objectId": "uuid-123", "data": {...} } ` |
| **화이트보드 시작** | **SUB** | `/topic/studies/rooms/{id}/whiteboard` | `json { "action": "START", "senderName": "Kim", "data": "Session Started" } ` |
| **화이트보드 종료** | **SUB** | *(위와 동일)* | `json { "action": "CLOSE", "data": "Session Closed" } ` |
| **전체 지우기** | **SUB** | *(위와 동일)* | `json { "action": "CLEAR", "data": null } ` |
| **그리기 수신**<br><br>(Server → Client) | **SUB** | *(위와 동일)* | `json { "action": "ADDED", "objectId": "uuid-123", "senderId": 100, "data": { "type": "rect", ... } } ` |
| **초기 동기화 수신**<br><br>(입장 시) | **SUB** | `.../whiteboard/{uid}` | `json { "action": "SYNC", "data": { "isActive": true, "history": [{ "action": "ADDED", ... }] } } ` |

### Action Definition (상세 동작)

| Action | 설명 | 필수 데이터 | 비고 |
| --- | --- | --- | --- |
| **`ADDED`** | 객체 생성 | `objectId`, `data` | 새로운 드로잉 요소 추가 |
| **`MODIFIED`** | 객체 수정 | `objectId`, `data` | 위치 이동, 크기 조절 등 |
| **`REMOVED`** | 객체 삭제 | `objectId` | `data: null` 가능 |
| **`START`** | 세션 시작 | `senderName` | 화이트보드 모드 활성화 알림 (**Toast 발생 트리거**) |
| **`CLOSE`** | 세션 종료 | - | 화이트보드 데이터 정리 및 닫기 |
| **`SYNC`** | 초기 데이터 | `history` | 현재 캔버스에 존재하는 **모든 객체 리스트** |

---

### 🛠 도구별 구현 가이드 (Tool Implementation Guide)

프론트엔드에서 도구 사용 시 발생시켜야 할 이벤트와 처리 로직입니다.

| 도구 (Tool) | 동작 시점 (Trigger) | 전송 Action | Payload 예시 | 비고 (Implementation Note) |
| --- | --- | --- | --- | --- |
| **✏️ 펜**<br><br>(Free Drawing) | `path:created`<br><br>(마우스 뗄 때) | **ADDED** | `data: { type: "path", path: [...], stroke: "red" ... }` | Fabric.js의 `Path` 객체를 JSON으로 변환하여 전송 |
| **🔲 도형**<br><br>(Shape) | `mouse:up`<br><br>(드래그 완료 시) | **ADDED** | `data: { type: "rect", width: 100, height: 100 ... }` | 드래그 중(`mouse:move`)에는 로컬에서만 그리고, 완료 시 서버 전송 |
| **T 텍스트**<br><br>(Text) | `text:editing:exited`<br><br>(입력 완료 시) | **ADDED**<br><br>or<br><br>**MODIFIED** | `data: { type: "i-text", text: "Hello", ... }` | 최초 생성 시 `ADDED`, 내용 수정 시 `MODIFIED` 전송 |
| **🗑 지우개**<br><br>(Eraser) | `mouse:down`<br><br>(객체 클릭 시) | **REMOVED** | `objectId: "uuid-123"`<br><br>`data: null` | **객체 단위 삭제 방식**<br><br>클릭된 객체의 `objectId`를 식별하여 삭제 요청 전송 |
| **✋ 선택/이동**<br><br>(Select/Move) | `object:modified`<br><br>(변형 완료 시) | **MODIFIED** | `objectId: "uuid-123"`<br><br>`data: { left: 200, top: 50 ... }` | 이동/크기조절/회전 후 마우스를 뗄 때 최종 상태 전송 |

---

## 💾 Client State Management

| 상태 (State) | 설명 |
| --- | --- |
| `isWhiteboardActive` | 화이트보드 세션 활성화 여부 (방 전체 공유 상태, VideoGrid 타일 표시 여부) |
| `whiteboardOpenedBy` | 화이트보드를 처음 연 사람 정보 |
| `isWhiteboardOverlayOpen` | 현재 사용자의 화이트보드 Split View 표시 여부 (로컬 상태) |
| `drawingData` | 실시간 동기화되는 드로잉 객체 Map (`objectId`를 Key로 사용) |

---

## 🛠 Implementation Tasks

* [x] **Core**: Canvas API (Fabric.js) 도입 및 캔버스 초기화
* [x] **UI Component**: 화이트보드 미리보기 타일 컴포넌트 구현
* [x] **UI Component**: 화이트보드 패널 UI 구현 (IDE Split View 방식, UNDO 버튼 제외)
* [x] **UI Component**: **Toast Notification 컴포넌트 연동 (화이트보드 활성화 시)**
* [x] **Logic**: 도구별(펜, 도형, 텍스트) 생성 로직 구현 (`ADDED`)
* [x] **Logic**: 지우개(객체 삭제) 로직 구현 (`REMOVED`)
* [x] **Logic**: 객체 이동/크기조절 이벤트 핸들링 (`MODIFIED`)
* [x] **Network**: WebSocket 이벤트 핸들러 구현 (`ADDED`, `MODIFIED`, `REMOVED`)
* [x] **Network**: 초기 진입 시 `SYNC` 데이터를 통한 캔버스 복원 로직 구현
* [x] **UI Flow**: Control Bar 버튼 → VideoGrid 타일 → IDE Split View 흐름 구현
