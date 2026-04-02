# Frontend Performance Improvement Report Template

## 1. Document Info

- Project: `Peekle Frontend`
- Report Title: `[Sprint/Phase Name] Frontend Performance Improvement Report`
- Report Period: `[YYYY-MM-DD ~ YYYY-MM-DD]`
- Author: `[Name]`
- Branch/Commit Range: `[before commit] -> [after commit]`
- Target Environment:
  - App: `[local / dev / staging / prod-like]`
  - Browser: `[Chrome version]`
  - Device: `[MacBook Mx / Windows / mobile device]`
  - Network Profile: `[No throttling / Fast 3G / custom]`
  - Build Mode: `[dev / production build]`

---

## 2. Report Goal

### 2.1 Background

`[What problem were users or the team experiencing?]`

Example:

- Study room entry triggered duplicate API calls and delayed initial rendering.
- Realtime code viewer remounted the readonly editor too often, causing visible jank.
- Dashboard widgets fetched duplicate data on first paint and during polling.

### 2.2 Success Criteria

- Initial room entry API calls reduced from `[X]` to `[Y]`
- Realtime readonly editor remount count reduced from `[X/min]` to `[Y/min]`
- Search-triggered requests reduced from `[X per query]` to `[Y per query]`
- Duplicate SSR/CSR fetches reduced from `[X]` to `[Y]`
- Target user-visible latency improved from `[X ms]` to `[Y ms]`

---

## 3. Measurement Rules

### 3.1 Common Rules

- Use the same environment for before/after measurements.
- Measure each scenario at least `3` times.
- Record both `cold` and `warm` runs when relevant.
- Separate `network`, `render`, and `business-flow` metrics.
- Attach raw evidence: DevTools screenshots, React Profiler exports, network logs, or console counters.

### 3.2 Statistical Rules

- Sample Count: `[3 / 5 / 10]`
- Summary Method: `[average / median / p95]`
- Outlier Rule: `[none / discard highest-lowest / explain manually]`

### 3.3 Delta Formula

- Absolute Delta = `After - Before`
- Improvement Rate = `((Before - After) / Before) * 100`
- If higher is better, mark explicitly:
  - Improvement Rate = `((After - Before) / Before) * 100`

---

## 4. Executive Summary

| Area | Main Issue | Before | After | Delta | Improvement | Evidence |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| Study room bootstrap | Duplicate room/member fetches | `[ ]` | `[ ]` | `[ ]` | `[ ]%` | `[link/path]` |
| Realtime code viewer | Readonly editor remount churn | `[ ]` | `[ ]` | `[ ]` | `[ ]%` | `[link/path]` |
| Problem refresh after submit | Repeated delayed refetches | `[ ]` | `[ ]` | `[ ]` | `[ ]%` | `[link/path]` |
| Study list search | Request per keystroke | `[ ]` | `[ ]` | `[ ]` | `[ ]%` | `[link/path]` |
| Dashboard weekly score | SSR/CSR duplicate fetch | `[ ]` | `[ ]` | `[ ]` | `[ ]%` | `[link/path]` |
| League polling | Same data polled by multiple widgets | `[ ]` | `[ ]` | `[ ]` | `[ ]%` | `[link/path]` |
| Workbook/Game search/filter | Unoptimized client/server flow | `[ ]` | `[ ]` | `[ ]` | `[ ]%` | `[link/path]` |

### 4.1 One-Line Summary

`[Summarize the total impact in one sentence.]`

Example:

`Reduced duplicate frontend requests and render churn across study, dashboard, and league flows, improving initial responsiveness and lowering repeated client work.`

---

## 5. Measurement Inventory

### 5.1 Scenario List

| Scenario ID | User Flow | Trigger | Metric Family | Tool | Owner |
| --- | --- | --- | --- | --- | --- |
| S1 | Enter study room | Open `/study/[id]` | Network + render | Chrome DevTools | `[ ]` |
| S2 | Watch teammate code | Switch to realtime viewer | Render + subscription | React Profiler + console counters | `[ ]` |
| S3 | Submit study solution | Click submit | Network + business sync | Network tab | `[ ]` |
| S4 | Search study rooms | Type keyword | API frequency | Network tab | `[ ]` |
| S5 | Open home dashboard | Initial page load | SSR/CSR duplication | Network tab | `[ ]` |
| S6 | Open league page/sidebar | Initial page load + 30s idle | Polling frequency | Network tab | `[ ]` |

### 5.2 Tools Used

- Chrome DevTools Network
- Chrome Performance Panel
- React Profiler
- Next.js bundle analyzer
- Console instrumentation
- Custom counters

---

## 6. Metric Definition Table

| Metric | Definition | Unit | Lower/Higher Better | Measurement Method |
| --- | --- | --- | --- | --- |
| API calls per action | Number of HTTP calls triggered by a single user action | count | Lower | DevTools Network |
| Duplicate request count | Same endpoint hit repeatedly without additional user intent | count | Lower | DevTools Network |
| Bytes transferred | Total network payload during scenario | KB/MB | Lower | DevTools Network |
| Initial visible latency | Time until user can meaningfully interact | ms | Lower | Performance panel/manual mark |
| Readonly editor remount count | Number of readonly Monaco remounts during realtime sync | count | Lower | Console counter / Profiler |
| Commit count | React commits during scenario | count | Lower | React Profiler |
| Render duration | Total commit/render time | ms | Lower | React Profiler |
| Polling calls per minute | Periodic fetch frequency across widgets | count/min | Lower | DevTools Network |
| Success reflection delay | Time from user action to UI-consistent state | ms | Lower | Manual stopwatch/log timestamps |

---

## 7. Area-by-Area Report

Repeat the following section for each improvement item.

---

## 7.X Improvement Item: `[Short Name]`

### A. Scope

- Area: `[study / game / home / league / ranking / workbook / shared infra]`
- Screen/Flow: `[route or feature]`
- Related Files:
  - `[path 1]`
  - `[path 2]`
  - `[path 3]`

### B. Problem Statement

`[Describe the inefficiency in business terms, not only technical terms.]`

Examples:

- Users wait longer to enter a study room because room metadata and member data are fetched repeatedly.
- Realtime collaboration feels unstable because the readonly editor is reconstructed too often.
- Dashboard cards consume unnecessary bandwidth because identical data is fetched by multiple widgets.

### C. Hypothesis

`[What did we expect would improve after the change?]`

### D. Baseline Instrumentation

- Scenario:
  - `[exact reproduction steps]`
- Sample Count:
  - `[3 / 5 / 10]`
- Tool:
  - `[DevTools / Profiler / custom logs]`
- Raw Evidence:
  - `[screenshot path / json export / video / log path]`

### E. Before Metrics

| Metric | Run 1 | Run 2 | Run 3 | Summary |
| --- | ---: | ---: | ---: | ---: |
| API calls per action | `[ ]` | `[ ]` | `[ ]` | `[ ]` |
| Duplicate request count | `[ ]` | `[ ]` | `[ ]` | `[ ]` |
| Bytes transferred | `[ ]` | `[ ]` | `[ ]` | `[ ]` |
| Initial visible latency (ms) | `[ ]` | `[ ]` | `[ ]` | `[ ]` |
| Commit count | `[ ]` | `[ ]` | `[ ]` | `[ ]` |
| Render duration (ms) | `[ ]` | `[ ]` | `[ ]` | `[ ]` |
| Business flow completion time (ms) | `[ ]` | `[ ]` | `[ ]` | `[ ]` |

### F. Root Cause

- Root cause 1: `[ ]`
- Root cause 2: `[ ]`
- Root cause 3: `[ ]`

### G. Change Summary

- Change 1: `[what changed]`
- Change 2: `[what changed]`
- Change 3: `[what changed]`

### H. After Instrumentation

- Scenario:
  - `[same scenario as before]`
- Sample Count:
  - `[same count]`
- Tool:
  - `[same tool]`
- Raw Evidence:
  - `[screenshot path / json export / video / log path]`

### I. After Metrics

| Metric | Run 1 | Run 2 | Run 3 | Summary |
| --- | ---: | ---: | ---: | ---: |
| API calls per action | `[ ]` | `[ ]` | `[ ]` | `[ ]` |
| Duplicate request count | `[ ]` | `[ ]` | `[ ]` | `[ ]` |
| Bytes transferred | `[ ]` | `[ ]` | `[ ]` | `[ ]` |
| Initial visible latency (ms) | `[ ]` | `[ ]` | `[ ]` | `[ ]` |
| Commit count | `[ ]` | `[ ]` | `[ ]` | `[ ]` |
| Render duration (ms) | `[ ]` | `[ ]` | `[ ]` | `[ ]` |
| Business flow completion time (ms) | `[ ]` | `[ ]` | `[ ]` | `[ ]` |

### J. Before/After Delta

| Metric | Before | After | Absolute Delta | Improvement |
| --- | ---: | ---: | ---: | ---: |
| API calls per action | `[ ]` | `[ ]` | `[ ]` | `[ ]%` |
| Duplicate request count | `[ ]` | `[ ]` | `[ ]` | `[ ]%` |
| Bytes transferred | `[ ]` | `[ ]` | `[ ]` | `[ ]%` |
| Initial visible latency (ms) | `[ ]` | `[ ]` | `[ ]` | `[ ]%` |
| Commit count | `[ ]` | `[ ]` | `[ ]` | `[ ]%` |
| Render duration (ms) | `[ ]` | `[ ]` | `[ ]` | `[ ]%` |
| Business flow completion time (ms) | `[ ]` | `[ ]` | `[ ]` | `[ ]%` |

### K. User Impact

- User-visible improvement: `[ ]`
- Team/ops improvement: `[ ]`
- Business impact: `[ ]`

### L. Trade-offs / Risks

- `[Any new complexity, cache invalidation risk, consistency trade-off, maintenance cost]`

### M. Verification Checklist

- [ ] Same user flow still works functionally
- [ ] Error handling still works
- [ ] Empty state still works
- [ ] Mobile behavior still works
- [ ] Realtime sync still converges
- [ ] No regression in auth/session behavior

### N. Portfolio/CV Summary

#### One-line Resume Bullet

`[Verb] [what system/feature] by [what change], reducing [metric] from [before] to [after] ([improvement]%).`

Example:

`Optimized realtime study-room code viewing by eliminating repeated readonly editor remounts, reducing render churn from 180 to 12 remounts per minute (93% improvement).`

#### Interview Summary

`[2-3 sentence explanation of problem, action, and measurable result.]`

---

## 8. Recommended Sections for This Project

Use one section each for the items below.

### 8.1 Study Room Bootstrap

- Candidate metrics:
  - `/api/studies/{id}` request count per entry
  - member sync request count
  - time to first usable room state
  - duplicate room-data fetch count

### 8.2 Realtime Code Viewer

- Candidate metrics:
  - readonly editor remount count per minute
  - React commit count while teammate types
  - average render duration while receiving code events
  - snapshot/request-subscription count

### 8.3 Problem Refresh After Submit

- Candidate metrics:
  - curriculum fetch count per submit
  - solved-state reflection delay
  - redundant retry count

### 8.4 Study List Search

- Candidate metrics:
  - requests per search input
  - average request count per completed query
  - time to stable result list

### 8.5 Dashboard SSR/CSR Duplication

- Candidate metrics:
  - duplicate fetch count on first page load
  - total transferred bytes on home/league load
  - widget-level polling overlap

### 8.6 League Polling Consolidation

- Candidate metrics:
  - polling calls per minute across page/sidebar/widgets
  - unique endpoints per 30-second interval
  - cache hit ratio if shared query cache is introduced

### 8.7 Workbook/Game Filter Flow

- Candidate metrics:
  - requests per filter change
  - list render duration after filter/search
  - repeated list refetch count

---

## 9. Final Summary Table for Presentation

| Item | Before | After | Improvement | Why It Matters |
| --- | --- | --- | --- | --- |
| Study room entry | `[ ]` | `[ ]` | `[ ]%` | `[ ]` |
| Realtime code view | `[ ]` | `[ ]` | `[ ]%` | `[ ]` |
| Submit result reflection | `[ ]` | `[ ]` | `[ ]%` | `[ ]` |
| Search responsiveness | `[ ]` | `[ ]` | `[ ]%` | `[ ]` |
| Dashboard duplicate fetch | `[ ]` | `[ ]` | `[ ]%` | `[ ]` |
| League polling load | `[ ]` | `[ ]` | `[ ]%` | `[ ]` |

### Presentation Summary

`[Summarize the whole optimization effort in 3-5 lines for slide or demo day use.]`

---

## 10. Appendix

### 10.1 Raw Evidence Links

- Network exports:
  - `[path]`
- React Profiler exports:
  - `[path]`
- Screenshots:
  - `[path]`
- Screen recordings:
  - `[path]`

### 10.2 Measurement Commands / Notes

```text
[Put exact reproduction notes here]

Example:
1. Open /study/123 with a fresh session
2. Wait until participant list and IDE are visible
3. Record all network calls until first interaction becomes possible
4. Repeat 3 times in production build
```

### 10.3 Change Log

- `[YYYY-MM-DD] Initial baseline recorded`
- `[YYYY-MM-DD] Improvement item 1 implemented`
- `[YYYY-MM-DD] Improvement item 1 re-measured`
- `[YYYY-MM-DD] Improvement item 2 implemented`
- `[YYYY-MM-DD] Final summary completed`
