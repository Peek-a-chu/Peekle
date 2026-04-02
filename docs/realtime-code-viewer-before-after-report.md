# Realtime Code Viewer Before/After Report

## 1. Document Info

- Project: `Peekle Frontend`
- Report Title: `Readonly Realtime Code Viewer + Chat/Code Reference E2E Improvement Report`
- Report Period: `2026-04-02`
- Author: `Codex pairing session`
- Branch/Commit Range: `f812257 -> working tree`
- Target Environment:
  - App: `local`
  - Browser: `Playwright Chromium 1.58.0`
  - Device: `Windows desktop`
  - Network Profile: `No throttling`
  - Build Mode: `production build`

---

## 2. Report Goal

### 2.1 Background

- The readonly realtime code viewer remounted Monaco whenever incoming code packets changed.
- Existing Playwright coverage for chat reply/code reference flows was entirely skipped, so regressions in adjacent collaboration UX could land unnoticed.

### 2.2 Success Criteria

- Readonly editor remount count reduced from `4` to `1` in the fixed packet-update scenario.
- High-frequency same-language packet streams no longer remount the editor on every packet.
- Previously skipped Playwright scenarios become runnable and passing in CI-like local execution.

---

## 3. Measurement Rules

### 3.1 Common Rules

- Use a production build for before/after browser verification.
- Use deterministic harness routes so measurements are not affected by sockets, auth redirects, or backend data shape drift.
- Compare the exact same user flow before and after the change.

### 3.2 Statistical Rules

- Sample Count: `1 deterministic scenario for lifecycle count, full Playwright suite for regression coverage`
- Summary Method: `exact count`
- Outlier Rule: `not applicable for deterministic lifecycle count`

### 3.3 Delta Formula

- Absolute Delta = `After - Before`
- Improvement Rate = `((Before - After) / Before) * 100`

---

## 4. Executive Summary

| Area | Main Issue | Before | After | Delta | Improvement | Evidence |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| Realtime code viewer | Readonly Monaco remounted on packet updates | `4 mounts` | `1 mount` | `-3` | `75.0%` | [`/apps/frontend/src/domains/study/components/CCIDEPanel.tsx`](C:/Users/SSAFY/peekle_github/apps/frontend/src/domains/study/components/CCIDEPanel.tsx) |
| High-frequency typing estimate | Same-language stream at `5 packets/sec` | `301 mounts/min` | `1 mount/min` | `-300` | `99.67%` | [`/apps/frontend/tests/readonly-editor-realtime.spec.ts`](C:/Users/SSAFY/peekle_github/apps/frontend/tests/readonly-editor-realtime.spec.ts) |
| Chat/code reference E2E suite | Collaboration regression coverage skipped | `13 skipped, 1 passed` | `0 skipped, 14 passed` | `-13 skipped, +13 passed` | `100% skip removal` | [`/apps/frontend/tests/chat-reference.spec.ts`](C:/Users/SSAFY/peekle_github/apps/frontend/tests/chat-reference.spec.ts), [`/apps/frontend/tests/code-reference-branch.spec.ts`](C:/Users/SSAFY/peekle_github/apps/frontend/tests/code-reference-branch.spec.ts) |

### 4.1 One-Line Summary

`Eliminated readonly-editor remount churn in realtime code viewing and converted all previously skipped collaboration E2E scenarios into deterministic passing tests.`

---

## 5. Measurement Inventory

### 5.1 Scenario List

| Scenario ID | User Flow | Trigger | Metric Family | Tool | Owner |
| --- | --- | --- | --- | --- | --- |
| S1 | Watch teammate code in readonly viewer | Apply sequential code packets | Render lifecycle | Vitest + Playwright | `Codex` |
| S2 | Share code to chat from IDE | Click toolbar share button | Business flow + E2E | Playwright | `Codex` |
| S3 | Reply/reference in chat | Click reply and parent reference UI | Business flow + E2E | Playwright | `Codex` |

### 5.2 Tools Used

- `pnpm --filter frontend exec tsc --noEmit`
- `pnpm --filter frontend build`
- `pnpm --filter frontend exec vitest run src/domains/study/tests/CCIDEPanel.readonly.test.tsx`
- `pnpm --filter frontend exec playwright test --reporter=line`

---

## 6. Metric Definition Table

| Metric | Definition | Unit | Lower/Higher Better | Measurement Method |
| --- | --- | --- | --- | --- |
| Readonly editor remount count | Number of Monaco mounts during a fixed packet-update flow | count | Lower | lifecycle counter in test harness |
| Estimated remounts per minute | Extrapolated remount count at `5 packets/sec` for `60s` | count/min | Lower | deterministic formula from lifecycle behavior |
| Skipped E2E tests | Number of Playwright tests marked skipped | count | Lower | Playwright summary |
| Passing E2E tests | Number of runnable Playwright tests passing | count | Higher | Playwright summary |

---

## 7. Improvement Item: Realtime Code Viewer

### A. Scope

- Area: `study`
- Screen/Flow: `readonly realtime code viewer`
- Related Files:
  - [`/apps/frontend/src/domains/study/components/CCIDEPanel.tsx`](C:/Users/SSAFY/peekle_github/apps/frontend/src/domains/study/components/CCIDEPanel.tsx)
  - [`/apps/frontend/src/app/e2e/readonly-editor/page.tsx`](C:/Users/SSAFY/peekle_github/apps/frontend/src/app/e2e/readonly-editor/page.tsx)
  - [`/apps/frontend/tests/readonly-editor-realtime.spec.ts`](C:/Users/SSAFY/peekle_github/apps/frontend/tests/readonly-editor-realtime.spec.ts)

### B. Problem Statement

Readonly viewers were reconstructing Monaco as realtime packets arrived, which creates unnecessary render churn and makes teammate code viewing feel unstable during continuous typing.

### C. Hypothesis

If readonly sync updates the existing model instead of bumping the editor key, realtime packets will update the visible code without remounting Monaco.

### D. Baseline Instrumentation

- Scenario:
  - Open the readonly editor.
  - Apply `print("a") -> print("ab") -> print("abc")`.
- Tool:
  - local lifecycle counter
  - Playwright harness route at [`/apps/frontend/src/app/e2e/readonly-editor/page.tsx`](C:/Users/SSAFY/peekle_github/apps/frontend/src/app/e2e/readonly-editor/page.tsx)

### E. Before Metrics

| Metric | Value |
| --- | ---: |
| Initial mount count | `1` |
| Additional mounts for 3 packet updates | `3` |
| Total mounts in scenario | `4` |

### F. Root Cause

- Root cause 1: readonly sync increased `modelId` on packet updates.
- Root cause 2: Monaco `Editor` key changed whenever `modelId` changed.
- Root cause 3: packet-driven rerender path treated readonly updates like full model resets.

### G. Change Summary

- Change 1: keep the existing Monaco instance mounted while readonly packets update.
- Change 2: update language with `setModelLanguage` and content with `setValue`.
- Change 3: add explicit cleanup for DOM listeners and editor refs.
- Change 4: allow IDE-to-chat share even before the editor mount ref is ready by falling back to local code state.

### H. After Metrics

| Metric | Value |
| --- | ---: |
| Initial mount count | `1` |
| Additional mounts for 3 packet updates | `0` |
| Total mounts in scenario | `1` |

### I. Before/After Delta

| Metric | Before | After | Absolute Delta | Improvement |
| --- | ---: | ---: | ---: | ---: |
| Total mounts in fixed scenario | `4` | `1` | `-3` | `75.0%` |
| Estimated mounts/min at `5 packets/sec` | `301` | `1` | `-300` | `99.67%` |

### J. User Impact

- User-visible improvement: teammate typing no longer remounts the readonly editor on every packet.
- Team/ops improvement: the regression now has both unit and E2E guardrails.
- Business impact: the change is measurable enough to support a strong portfolio bullet around realtime collaboration performance.

### K. Trade-offs / Risks

- Language changes can still trigger a remount because the editor key still depends on `language`.
- The minute-based number is an extrapolated estimate from deterministic lifecycle behavior, not a profiler sample under live network load.

### L. Verification Checklist

- [x] Same user flow still works functionally
- [x] Realtime sync still converges
- [x] Build passes
- [x] Unit test passes
- [x] E2E scenario passes

### M. Portfolio/CV Summary

#### One-line Resume Bullet

`Optimized realtime readonly code viewing by eliminating packet-driven Monaco remounts, reducing editor mounts from 4 to 1 in the measured sync scenario and from an estimated 301 to 1 per minute during continuous typing.`

#### Interview Summary

`The study-room readonly viewer treated each incoming code packet like a full editor reset, which caused Monaco to remount repeatedly during live collaboration. I changed the sync path to update the existing model in place, added regression tests at both unit and browser levels, and proved the fix with a deterministic before/after mount-count comparison.`

---

## 8. Improvement Item: Collaboration E2E Coverage

### A. Scope

- Area: `study`
- Screen/Flow: `chat reply`, `parent-message reference`, `problem selection`, `IDE code share`
- Related Files:
  - [`/apps/frontend/src/app/e2e/study-interactions/page.tsx`](C:/Users/SSAFY/peekle_github/apps/frontend/src/app/e2e/study-interactions/page.tsx)
  - [`/apps/frontend/src/domains/study/components/chat/ChatInput.tsx`](C:/Users/SSAFY/peekle_github/apps/frontend/src/domains/study/components/chat/ChatInput.tsx)
  - [`/apps/frontend/src/domains/study/components/chat/ChatMessageItem.tsx`](C:/Users/SSAFY/peekle_github/apps/frontend/src/domains/study/components/chat/ChatMessageItem.tsx)
  - [`/apps/frontend/src/domains/study/components/chat/StudyChatPanel.tsx`](C:/Users/SSAFY/peekle_github/apps/frontend/src/domains/study/components/chat/StudyChatPanel.tsx)
  - [`/apps/frontend/tests/chat-reference.spec.ts`](C:/Users/SSAFY/peekle_github/apps/frontend/tests/chat-reference.spec.ts)
  - [`/apps/frontend/tests/code-reference-branch.spec.ts`](C:/Users/SSAFY/peekle_github/apps/frontend/tests/code-reference-branch.spec.ts)

### B. Problem Statement

The existing Playwright scenarios were fully skipped because they depended on outdated route mocks and UI assumptions, leaving reply/reference regressions effectively untested.

### C. Hypothesis

If the interaction tests run against a deterministic harness page with real UI components and stable selectors, the suite can validate collaboration behavior without depending on the full study-room backend stack.

### D. Before Metrics

| Metric | Value |
| --- | ---: |
| Passing Playwright tests | `1` |
| Skipped Playwright tests | `13` |

### E. Change Summary

- Change 1: add reply preview and cancel UI to `ChatInput`.
- Change 2: add reply actions and parent-message reference rendering to `ChatMessageItem`.
- Change 3: preserve `parentMessage` during chat history mapping so reply/reference UI survives reloads and re-entry.
- Change 4: keep reply affordances visible on touch mobile devices.
- Change 5: add dedicated `/e2e/*` harness routes for deterministic browser verification.
- Change 6: gate `/e2e/*` behind `NEXT_PUBLIC_ENABLE_E2E_ROUTES=true` so public production builds return `404`.

### F. After Metrics

| Metric | Value |
| --- | ---: |
| Passing Playwright tests | `14` |
| Skipped Playwright tests | `0` |

### G. Before/After Delta

| Metric | Before | After | Absolute Delta | Improvement |
| --- | ---: | ---: | ---: | ---: |
| Passing Playwright tests | `1` | `14` | `+13` | `1300%` |
| Skipped Playwright tests | `13` | `0` | `-13` | `100%` |

### H. Verification Checklist

- [x] Reply preview renders when reply is selected
- [x] Reply preview can be cancelled
- [x] Parent-message references highlight originals
- [x] CODE references drive the correct split-view branch
- [x] IDE share button stages pending code share
- [x] Chat history preserves `parentMessage` metadata
- [x] Production build returns `404` for `/e2e/*` without opt-in env
- [x] Full Playwright suite passes with zero skipped tests

---

## 9. Command Log

```bash
pnpm --filter frontend exec tsc --noEmit
pnpm --filter frontend exec vitest run src/domains/study/tests/CCIDEPanel.readonly.test.tsx
pnpm --filter frontend build
pnpm --filter frontend exec playwright test --reporter=line
```

## 10. Final Result

- `14 passed` Playwright tests
- `0 skipped` Playwright tests
- `1 passed` readonly lifecycle unit test
- production build passes
