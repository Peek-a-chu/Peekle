"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventsGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const crypto_1 = require("crypto");
let EventsGateway = class EventsGateway {
    constructor() {
        this.mockTypingIntervals = new Map();
        this.sessionStore = new Map();
        this.userProblemStore = new Map();
    }
    handleConnection(client) {
        console.log(`Client connected: ${client.id}`);
    }
    handleDisconnect(client) {
        console.log(`Client disconnected: ${client.id}`);
        this.server.emit("user-disconnected", client.id);
    }
    handleJoinRoom(data, client) {
        client.join(data.roomId);
        console.log(`User ${data.userId} joined room ${data.roomId}`);
        client.to(data.roomId).emit("user-connected", data.userId);
        const key = `${data.roomId}:${data.userId}`;
        const session = this.sessionStore.get(key);
        if (session) {
            console.log(`Restoring session for user ${data.userId}`, session);
            client.emit("code-restore", session);
        }
        return { event: "join-room", success: true };
    }
    handleMessage(data, client) {
        const enrichedData = {
            ...data,
            id: data.id || (0, crypto_1.randomUUID)(),
            content: data.message,
            createdAt: new Date().toISOString(),
        };
        this.server.to(data.roomId).emit("chat-message", enrichedData);
    }
    handleRequestCode(data, client) {
        if ([2, 3].includes(data.targetUserId)) {
            const key = `${data.roomId}:${data.targetUserId}`;
            const isPython = data.targetUserId === 2;
            if (this.mockTypingIntervals.has(key)) {
                clearInterval(this.mockTypingIntervals.get(key));
                this.mockTypingIntervals.delete(key);
            }
            let step = 0;
            const sendMockUpdate = () => {
                step++;
                const timestamp = new Date().toISOString().split("T")[1].split(".")[0];
                const baseCode = isPython
                    ? `import sys\nimport time\n\n# Mock User ${data.targetUserId} (Python Bot)\n# Session Started: ${timestamp}\n\ndef solve():\n    print("Hello from Mock Bot 🐍")`
                    : `public class Main {\n    // Mock User ${data.targetUserId} (Java Bot)\n    // Session Started: ${timestamp}\n    public static void main(String[] args) {\n        System.out.println("Hello World");\n    }\n}`;
                const dynamicCode = isPython
                    ? `${baseCode}\n    print("Typing step ${step}")\n    # 작업중...`
                    : `${baseCode.slice(0, -2)}\n        System.out.println("Step ${step}");\n    }\n}`;
                this.server.to(data.roomId).emit("code-update", {
                    userId: data.targetUserId,
                    code: dynamicCode,
                });
                if (step > 30) {
                    const timer = this.mockTypingIntervals.get(key);
                    if (timer)
                        clearInterval(timer);
                    this.mockTypingIntervals.delete(key);
                }
            };
            sendMockUpdate();
            const interval = setInterval(sendMockUpdate, 2000);
            this.mockTypingIntervals.set(key, interval);
            return;
        }
        client.to(data.roomId).emit("request-code", {
            requesterId: client.handshake.query.userId,
            targetUserId: data.targetUserId,
        });
    }
    handleOffer(data, client) {
        console.log(`Sending offer to ${data.to}`);
        client.to(data.to).emit("offer", { offer: data.offer, from: client.id });
    }
    handleAnswer(data, client) {
        console.log(`Sending answer to ${data.to}`);
        client.to(data.to).emit("answer", { answer: data.answer, from: client.id });
    }
    handleIceCandidate(data, client) {
        console.log(`Sending ice-candidate to ${data.to}`);
        client
            .to(data.to)
            .emit("ice-candidate", { candidate: data.candidate, from: client.id });
    }
    handleCodeChange(data, client) {
        const userId = client.handshake.query.userId;
        if (userId) {
            const userKey = `${data.roomId}:${userId}`;
            const problemId = data.problemId || this.userProblemStore.get(userKey);
            if (problemId) {
                const sessionKey = `${data.roomId}:${userId}:${problemId}`;
                const currentSession = this.sessionStore.get(sessionKey) || { code: "" };
                this.sessionStore.set(sessionKey, { ...currentSession, code: data.code });
            }
        }
        client
            .to(data.roomId)
            .emit("code-update", { userId: Number(userId), code: data.code });
    }
    handleLanguageChange(data, client) {
        const userId = client.handshake.query.userId;
        console.log(`Language update from ${userId}: ${data.language}`);
        if (userId) {
            const userKey = `${data.roomId}:${userId}`;
            const problemId = data.problemId || this.userProblemStore.get(userKey);
            if (problemId) {
                const sessionKey = `${data.roomId}:${userId}:${problemId}`;
                const currentSession = this.sessionStore.get(sessionKey) || { code: "" };
                this.sessionStore.set(sessionKey, {
                    ...currentSession,
                    language: data.language,
                });
            }
        }
        client.to(data.roomId).emit("language-update", {
            userId: Number(userId),
            language: data.language,
        });
    }
    handleSelectProblem(data, client) {
        const userId = client.handshake.query.userId;
        if (!userId)
            return;
        const userKey = `${data.roomId}:${userId}`;
        const previousProblemId = this.userProblemStore.get(userKey);
        this.userProblemStore.set(userKey, data.problemId);
        console.log(`User ${userId} selected problem ${data.problemId} (prev: ${previousProblemId})`);
        const sessionKey = `${data.roomId}:${userId}:${data.problemId}`;
        const session = this.sessionStore.get(sessionKey);
        if (session) {
            console.log(`Restoring code for problem ${data.problemId}`, session);
            client.emit("code-restore", {
                code: session.code,
                language: session.language,
                problemId: data.problemId,
            });
        }
        else {
            client.emit("code-restore", {
                code: null,
                language: null,
                problemId: data.problemId,
            });
        }
        return { event: "select-problem", success: true, problemId: data.problemId };
    }
    notifyProblemUpdate(studyId) {
        console.log(`Notifying problem update for room ${studyId}`);
        this.server.to(studyId).emit("problem-updated");
    }
};
exports.EventsGateway = EventsGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], EventsGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)("join-room"),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], EventsGateway.prototype, "handleJoinRoom", null);
__decorate([
    (0, websockets_1.SubscribeMessage)("chat-message"),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], EventsGateway.prototype, "handleMessage", null);
__decorate([
    (0, websockets_1.SubscribeMessage)("request-code"),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], EventsGateway.prototype, "handleRequestCode", null);
__decorate([
    (0, websockets_1.SubscribeMessage)("offer"),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], EventsGateway.prototype, "handleOffer", null);
__decorate([
    (0, websockets_1.SubscribeMessage)("answer"),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], EventsGateway.prototype, "handleAnswer", null);
__decorate([
    (0, websockets_1.SubscribeMessage)("ice-candidate"),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], EventsGateway.prototype, "handleIceCandidate", null);
__decorate([
    (0, websockets_1.SubscribeMessage)("code-change"),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], EventsGateway.prototype, "handleCodeChange", null);
__decorate([
    (0, websockets_1.SubscribeMessage)("language-change"),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], EventsGateway.prototype, "handleLanguageChange", null);
__decorate([
    (0, websockets_1.SubscribeMessage)("select-problem"),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], EventsGateway.prototype, "handleSelectProblem", null);
exports.EventsGateway = EventsGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: "*",
        },
        namespace: "/study",
    })
], EventsGateway);
//# sourceMappingURL=events.gateway.js.map