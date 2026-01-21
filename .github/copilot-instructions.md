# Peekle - AI Coding Agent Instructions

## ⚠️ CRITICAL: Read Before Any Frontend Work

**BEFORE editing ANY frontend code, YOU MUST read these instruction files:**

1. **`.github/instructions/frontend-rule.instructions.md`** - Design principles (Readability, Predictability, Cohesion, Coupling)
2. **`.github/instructions/toss-frontend-rule.instructions.md`** - Naming conventions, project structure, and coding standards

These files contain **mandatory patterns and conventions** that MUST be followed. Failure to read these will result in code that doesn't match project standards.

---

## 🎯 Project Overview
**Peekle** is a gamified algorithm study platform with real-time collaboration features. Users study together via WebRTC video rooms, compete in timed coding challenges, and climb league rankings.

**Core Loop:** Study (collaborative IDE + WebRTC) → Games (time-attack competitions) → League (weekly tier system)

---

## 🏗️ Architecture

### Monorepo Structure
```
apps/frontend/     # Next.js 15 + TypeScript (pnpm)
apps/backend/      # Spring Boot 3.4 + Java 21 (Gradle)
docker/            # Redis, Coturn, OpenVidu services
docs/spec/         # PRD, architecture, API specs, story docs
```

### Tech Stack
- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind, Shadcn/UI, TanStack Query, Zustand
- **Backend**: Spring Boot 3.4, MySQL 8.0, Redis 7.x, Spring Security + OAuth2 + JWT
- **Real-time**: STOMP WebSocket (chat/signaling), OpenVidu (WebRTC media)
- **Package Managers**: pnpm 10.28.1 (frontend), Gradle 8.x (backend)

### Data Flow Pattern
- **MySQL**: Persistent data (users, problems, game results, league history)
- **Redis**: Session storage, real-time leaderboards (ZSet), STOMP broker, cache
- **ChromaDB**: AI problem recommendations (vector search)

---

## 🚀 Development Workflows

### Frontend Commands (from `apps/frontend/`)
```bash
pnpm install              # Install dependencies
pnpm dev                  # Dev server on localhost:3000
pnpm build                # Production build
pnpm lint                 # ESLint check
pnpm format               # Prettier format
pnpm type-check           # TypeScript validation
```

### Backend Commands (from `apps/backend/`)
```bash
./gradlew bootRun         # Run Spring Boot app
./gradlew test            # Run tests
./gradlew build           # Build JAR
```

### Infrastructure (from project root)
```bash
make webrtc-up            # Start Coturn + OpenVidu
make webrtc-down          # Stop WebRTC services
make coturn-logs          # View Coturn logs
make openvidu-logs        # View OpenVidu logs
```

---

## 📋 Frontend Code Conventions

### Naming Rules
- **camelCase**: Variables, functions, hooks, folders (`isLoggedIn`, `handleClick`, `useUser`, `api/`, `hooks/`)
- **PascalCase**: Components, types/interfaces, component files (`UserCard`, `UserData`, `UserCard.tsx`)
- **SNAKE_CASE**: Constants and env vars (`const ANIMATION_DELAY_MS = 300`, `API_KEY`)
- **Prefixes**:
  - `handle`: Event handlers (`handleLoginButton`)
  - `on`: Props for callbacks (`onSubmit`)
  - `is`: Boolean returns (`isValid`, avoid `isNot`)
  - `use`: Custom hooks (`useRoomStore`)
  - `fetch`: Async API calls (`fetchUser`)
- **Component Prefixes**: `SC` for Server Components, `CC` for Client Components (Next.js App Router)

### TypeScript Rules
- **Avoid `any`**: Use specific types or `unknown`
- **Props**: Define with `interface` (e.g., `interface ButtonProps`)
- **Return Types**: Standardize similar functions (e.g., all validation functions return `{ ok: true } | { ok: false; reason: string }`)
- **React.FC**: Avoid; use direct function definitions with typed props
- **Discriminated Unions**: For result types with success/error states

### Component Design Principles
1. **Abstraction**: Wrap complex auth/dialog logic in dedicated components (`<AuthGuard>`, `<InviteButton>`)
2. **Conditional Rendering**: Separate significantly different UIs into distinct components (`ViewerSubmitButton` vs `AdminSubmitButton`)
3. **Magic Numbers**: Extract to named constants (`const ANIMATION_DELAY_MS = 300`)
4. **Complex Ternaries**: Replace with IIFE or separate components
5. **Props Drilling**: Use composition (`children`) instead of passing props through intermediaries

### State Management Strategy
- **Server State**: TanStack Query (React Query) - Always return full `UseQueryResult`
  ```tsx
  function useUser(): UseQueryResult<UserType, Error> {
    return useQuery({ queryKey: ['user'], queryFn: fetchUser });
  }
  ```
- **Client State**: Zustand - Scope stores by feature (e.g., `useRoomStore` for viewing mode)
- **Query Params**: Dedicated hooks per param (e.g., `useCardIdQueryParam()`)
- **Form State**:
  - **Field-Level**: Independent validation with `react-hook-form`'s `validate`
  - **Form-Level**: Use Zod schema when fields are interdependent

### Project Structure (Next.js 15)
```
apps/frontend/src/
├── app/                    # Next.js App Router (kebab-case folders)
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Home page
│   └── study/[id]/         # Dynamic route
├── components/             # Shared UI components (PascalCase)
│   └── button/
├── domains/                # Feature-organized code (PascalCase)
│   ├── game/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── api/
│   └── user/
├── assets/                 # Shared images/icons (camelCase)
├── hooks/                  # Shared hooks (camelCase)
├── lib/                    # Utils like cn() (camelCase)
└── ...
```
- **Cohesion**: Keep feature-related code (UI, hooks, API) together in `Domains/`
- **Promotion**: Move to `Components/` or `hooks/` only when used by 2+ domains
- **Server Actions**: Place in respective domain folders

### Import Order
```tsx
// 1. React
import { useState, useEffect } from 'react';
// 2. Libraries (Next.js, etc.)
import { useRouter } from 'next/navigation';
// 3. Internal modules (@/ path mapping)
import { fetchUser } from '@/api/userApi';
import { useRoomStore } from '@/hooks/useRoomStore';
// 4. Components
import { Button } from '@/Components/Button';
// 5. Styles/Images
import SearchSVG from '@/assets/icons/search.svg';
```

### Styling Conventions
- **Units**: Use `rem`/`em` over `px` for responsive design
- **Tailwind**: Prefer utility classes; use responsive prefixes (`sm:`, `md:`)
- **Conditional Classes**: Use `cn()` helper from `lib/utils.ts`
- **Quotes**: Single quotes `'` by default; double `"` for HTML attributes, JSON, or strings with apostrophes

### React Best Practices
- **Conditional Rendering**: Use ternary over `&&` to avoid rendering `0`
  ```tsx
  {isLoggedIn ? <Dashboard /> : <Login />}  // ✅
  {count && <div>{count}</div>}             // ❌ renders '0'
  ```
- **Fragments**: Use `<>` instead of unnecessary `<div>` wrappers
- **Arrow Functions**: Default for consistency
- **Client Components**: Mark with `'use client'` when using hooks/browser events
- **Server Components**: Mark with `'use server'` to restrict client-side usage

---

## 🔌 Key Integration Points

### WebRTC Flow (Study/Game Rooms)
1. Frontend requests session: `POST /api/sessions` → Backend proxies to OpenVidu → returns `sessionId`
2. Frontend requests token: `POST /api/sessions/{id}/connections` → Backend returns `token`
3. Frontend connects to OpenVidu media server using token

### Extension Handshake (Chrome Extension ↔ Web App)
Uses `window.postMessage` for security:
1. Web app sends `{ type: 'PEEKLE_HELLO' }`
2. Extension responds `{ type: 'PEEKLE_ACK', version: '1.0' }`
3. Auth sync: `{ type: 'PEEKLE_AUTH', token: '...' }`
4. Submission tracking: Extension calls `POST /api/studies/{studyId}/submit` on BOJ solve

### Collaborative Editor
- Protocol: STOMP topic `/topic/study/room/{id}/code`
- Strategy: Last-Write-Wins or CRDT-lite
- Monaco Editor `onChange` → broadcast delta → subscribers apply changes

---

## 🎯 Backend Patterns

### Global Response Wrapper
All APIs return standardized format:
```json
{ "success": true, "data": {...}, "error": null }
{ "success": false, "data": null, "error": { "code": "USER_NOT_FOUND", "message": "..." } }
```

### Error Handling
- `GlobalExceptionHandler` catches all `BusinessException` types
- See `apps/backend/src/main/java/com/peekle/global/exception/`

### Configuration
- Environment-specific: `application-{profile}.yml`
- Credentials in environment variables, not code

---

## 📐 Project-Specific Patterns

### Weekly League Reset (Spring Batch)
- **Schedule**: Every Wednesday 03:00-04:00 KST (maintenance window)
- **Process**: Snapshot rankings → calculate promotions/relegations → bulk update `USERS` table → archive to `LEAGUE_HISTORY` → reset Redis rankings
- **Rule Management**: Promotion/relegation criteria in Java Enum (NOT database) for version control

### Route Layout Rules
- **Standard pages** (`/home`, `/profile`): Show LNB (Left Navigation Bar)
- **Immersive rooms** (`/study/[id]`, `/games/[id]`): Hide LNB, show back button top-left

### Desktop-First Policy
- Primary target: Desktop browsers (PC-optimized UI)
- Mobile: "View Only" mode or prompt to use desktop

---

## 🗂️ Essential Files to Reference

### Documentation
- `docs/spec/prd.md` - Product requirements, user personas, MVP scope
- `docs/spec/architecture.md` - System design, data flows, tech decisions
- `docs/spec/api-spec.md` - Backend API endpoints and contracts
- `docs/spec/epics/*.md` - Feature epics by domain team
- `docs/spec/epics/stories/*.md` - Detailed user stories with acceptance criteria

### Frontend
- `apps/frontend/src/app/layout.tsx` - Root layout with global providers
- `apps/frontend/src/lib/utils.ts` - Tailwind `cn()` helper
- `.github/instructions/frontend-rule.instructions.md` - Detailed design principles
- `.github/instructions/toss-frontend-rule.instructions.md` - Naming and structure rules

### Backend
- `apps/backend/src/main/java/com/peekle/global/exception/GlobalExceptionHandler.java` - Error handling
- `apps/backend/src/main/java/com/peekle/global/dto/ApiResponse.java` - Response wrapper
- `apps/backend/src/main/resources/application-dev.yml` - Dev environment config

### Infrastructure
- `docker/coturn/turnserver.conf` - TURN server config (WebRTC NAT traversal)
- `docker/openvidu/docker-compose.yml` - Media server setup
- `Makefile` - WebRTC infrastructure management commands

---

## 💡 Development Tips

1. **Before editing frontend code**: Read `.github/instructions/frontend-rule.instructions.md` for design patterns
2. **Naming conventions**: Reference `.github/instructions/toss-frontend-rule.instructions.md`
3. **API changes**: Update `docs/spec/api-spec.md` and backend contracts simultaneously
4. **New features**: Check `docs/spec/epics/` for story acceptance criteria and dependencies
5. **WebRTC issues**: Verify Coturn/OpenVidu are running (`make webrtc-up`), check logs
6. **State management**: Use TanStack Query for server data, Zustand for local UI state only
7. **Form validation**: Choose field-level (independent) or form-level (Zod schema) based on interdependencies
8. **Component organization**: Start in `Domains/{Feature}/`, promote to `Components/` only when reused
