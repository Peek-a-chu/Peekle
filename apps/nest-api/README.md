# NestJS API Server (Test)

This is a test API server for Peekle, built with NestJS.
It provides HTTP endpoints and WebSocket gateway for WebRTC signaling testing.

## Port
- Runs on **3001** (to avoid conflict with Next.js on 3000)

## Features
- **HTTP**: `GET /` (Hello World), `GET /study/rooms` (Mock data)
- **WebSocket (Socket.io)**: Namespace `/study`
  - Events: `join-room`, `chat-message`
  - Signaling: `offer`, `answer`, `ice-candidate`

## How to Run

From the root of the monorepo:

```bash
# Install dependencies
pnpm install

# Run dev server
pnpm --filter nest-api dev
# OR using turbo
npx turbo dev --filter nest-api
# 또는
pnpm turbo dev --filter nest-apinpx turbo dev --filter nest-api
```

## Socket.io Client Example

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001/study');

socket.emit('join-room', { roomId: '1', userId: 'user1' });

socket.on('message', (msg) => console.log(msg));
```
