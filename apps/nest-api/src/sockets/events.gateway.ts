import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";

@WebSocketGateway({
  cors: {
    origin: "*", // Allow all origins (no credentials) for maximum compatibility
  },
  namespace: "/study", // separate namespace for study rooms
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private mockTypingIntervals = new Map<string, NodeJS.Timeout>();
  // Store session per user: "roomId:userId" -> { code, language }
  private sessionStore = new Map<string, { code: string; language?: string }>();

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    // Handle cleanup (leave room, etc)
    this.server.emit("user-disconnected", client.id);
  }

  @SubscribeMessage("join-room")
  handleJoinRoom(
    @MessageBody() data: { roomId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(data.roomId);
    console.log(`User ${data.userId} joined room ${data.roomId}`);

    // Notify others in room
    client.to(data.roomId).emit("user-connected", data.userId);

    // [Persistence] Restore code if exists
    const key = `${data.roomId}:${data.userId}`;
    const session = this.sessionStore.get(key);
    if (session) {
      console.log(`Restoring session for user ${data.userId}`, session);
      client.emit("code-restore", session);
    }

    return { event: "join-room", success: true };
  }

  @SubscribeMessage("chat-message")
  handleMessage(
    @MessageBody() data: { roomId: string; message: string; sender: string },
    @ConnectedSocket() client: Socket,
  ) {
    this.server.to(data.roomId).emit("chat-message", data);
  }

  @SubscribeMessage("request-code")
  handleRequestCode(
    @MessageBody() data: { roomId: string; targetUserId: number },
    @ConnectedSocket() client: Socket,
  ) {
    // [TEST] Mock Data Response for User 2 & 3
    if ([2, 3].includes(data.targetUserId)) {
      const key = `${data.roomId}:${data.targetUserId}`;
      const isPython = data.targetUserId === 2;

      // Clear existing interval to prevent duplicates
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

        // Stop after 60 seconds (approx 30 updates)
        if (step > 30) {
          const timer = this.mockTypingIntervals.get(key);
          if (timer) clearInterval(timer);
          this.mockTypingIntervals.delete(key);
        }
      };

      // Send initial immediately
      sendMockUpdate();

      // Start interval (2 seconds)
      const interval = setInterval(sendMockUpdate, 2000);
      this.mockTypingIntervals.set(key, interval);

      return;
    }

    // requesterId logic if needed, but simple broadcast works if filtered by client
    // Broadcast to room - clients must filter by targetUserId
    client.to(data.roomId).emit("request-code", {
      requesterId: client.handshake.query.userId,
      targetUserId: data.targetUserId,
    });
  }

  // WebRTC Signaling Events
  @SubscribeMessage("offer")
  handleOffer(
    @MessageBody()
    data: { offer: RTCSessionDescriptionInit; to: string; roomId: string },
    @ConnectedSocket() client: Socket,
  ) {
    console.log(`Sending offer to ${data.to}`);
    client.to(data.to).emit("offer", { offer: data.offer, from: client.id });
  }

  @SubscribeMessage("answer")
  handleAnswer(
    @MessageBody()
    data: { answer: RTCSessionDescriptionInit; to: string; roomId: string },
    @ConnectedSocket() client: Socket,
  ) {
    console.log(`Sending answer to ${data.to}`);
    client.to(data.to).emit("answer", { answer: data.answer, from: client.id });
  }

  @SubscribeMessage("ice-candidate")
  handleIceCandidate(
    @MessageBody()
    data: { candidate: RTCIceCandidate; to: string; roomId: string },
    @ConnectedSocket() client: Socket,
  ) {
    console.log(`Sending ice-candidate to ${data.to}`);
    client
      .to(data.to)
      .emit("ice-candidate", { candidate: data.candidate, from: client.id });
  }

  @SubscribeMessage("code-change")
  handleCodeChange(
    @MessageBody() data: { roomId: string; code: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.handshake.query.userId;

    // [Persistence] Save code to store
    if (userId) {
      const key = `${data.roomId}:${userId}`;
      const currentSession = this.sessionStore.get(key) || { code: "" };
      this.sessionStore.set(key, { ...currentSession, code: data.code });
    }

    // console.log(`Code update from ${userId}`);
    client
      .to(data.roomId)
      .emit("code-update", { userId: Number(userId), code: data.code });
  }

  @SubscribeMessage("language-change")
  handleLanguageChange(
    @MessageBody() data: { roomId: string; language: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.handshake.query.userId;
    console.log(`Language update from ${userId}: ${data.language}`);

    // [Persistence] Save language to store
    if (userId) {
      const key = `${data.roomId}:${userId}`;
      const currentSession = this.sessionStore.get(key) || { code: "" };
      this.sessionStore.set(key, {
        ...currentSession,
        language: data.language,
      });
    }

    client.to(data.roomId).emit("language-update", {
      userId: Number(userId),
      language: data.language,
    });
  }
}
