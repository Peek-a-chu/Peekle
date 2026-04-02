## 변경 이유 / 배경

- 실시간 코드 보기(readonly)에서 원격 코드 패킷이 들어올 때마다 Monaco가 재마운트되어 렌더링 비용이 과도하게 발생하고 있었습니다.
- 채팅 reply/code reference 관련 Playwright 시나리오는 전부 `skip` 상태라서 협업 UX 회귀를 잡아내지 못하고 있었습니다.
- 이번 작업은 성능 병목을 제거하고, 해당 흐름을 실제 브라우저 E2E로 고정하는 데 목적이 있습니다.

## 이번 작업 내용

- [x] `CCIDEPanel` readonly 동기화를 인플레이스 업데이트로 전환해 패킷마다 발생하던 Monaco 재마운트를 제거했습니다.
- [x] `ChatInput`에 reply preview / cancel UI를 추가했습니다.
- [x] `ChatMessageItem`에 reply 액션, parent-message reference UI, reference 클릭 시 highlight 및 code-view 분기 로직을 추가했습니다.
- [x] `StudyChatPanel`에서 `replyingTo` 상태를 실제 입력창과 연동하고 전송/취소 시 정리하도록 보완했습니다.
- [x] 채팅 history 매핑에서도 `parentMessage`를 보존하도록 수정해 새로고침/재입장 후에도 reference UI가 유지되게 했습니다.
- [x] 터치 모바일 환경에서는 reply 버튼이 항상 보이도록 접근성을 보완했습니다.
- [x] `/e2e/readonly-editor`, `/e2e/study-interactions` 테스트 전용 harness 페이지를 추가했습니다.
- [x] `/e2e/*`는 `NEXT_PUBLIC_ENABLE_E2E_ROUTES=true`일 때만 열리도록 게이트를 추가해 public prod에서 404로 막았습니다.
- [x] 기존 `skip` 되어 있던 Playwright 스펙을 deterministic harness 기반으로 전환해 모두 runnable 상태로 복구했습니다.

## 관련 이슈

- Closes #[이슈 번호 입력]

## 스크린샷 (선택)

- 없음
- 필요 시 `/e2e/readonly-editor`, `/e2e/study-interactions` 화면 캡처 추가 가능

## 테스트 방법

- [x] `pnpm --filter frontend exec tsc --noEmit`
- [x] `pnpm --filter frontend exec vitest run src/domains/study/tests/CCIDEPanel.readonly.test.tsx`
- [x] `pnpm --filter frontend build`
- [x] `pnpm --filter frontend exec playwright test --reporter=line`

### 테스트 결과 요약

- Playwright: `14 passed, 0 skipped`
- Vitest: `1 passed`
- Realtime readonly 시나리오 기준 Monaco mount 수: `4 -> 1`
- 연속 타이핑 추정치(동일 언어, 5 packets/sec): `301/min -> 1/min`

## 체크리스트

- [x] 이 PR은 프로젝트의 코드 컨벤션과 일치합니다.
- [ ] 관련 이슈를 `Closes #...` 형식으로 연결했습니다.
- [x] 자체 리뷰를 진행했습니다.
- [x] 빌드 및 테스트를 통과했습니다.

## 리뷰어에게 (선택)

- 우선 봐주시면 좋은 부분은 `CCIDEPanel` readonly sync 경로와 `ChatMessageItem`의 reference click 분기입니다.
- `/e2e/study-interactions`는 실제 스터디룸 전체를 띄우지 않고도 협업 흐름을 검증하기 위한 harness이므로, 추후 관련 E2E 추가 시 같은 패턴을 재사용하면 됩니다.
- 아직 남아 있는 후속 과제는 `language` 변경 시 editor key 기반 remount를 완전히 제거하는 작업입니다.
