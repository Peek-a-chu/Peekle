import { Injectable } from "@nestjs/common";
import { Connection } from "sockjs";

@Injectable()
export class SocketService {
  // Store session per user: connectionId -> { userId, roomId, conn }
  private clients = new Map<string, { conn: Connection; userId?: string; roomId?: string }>();
  
  // RoomId -> Set<ConnectionId>
  private rooms = new Map<string, Set<string>>();

  handleConnection(conn: Connection) {
    console.log(`STOMP Client connected: ${conn.id}`);
    this.clients.set(conn.id, { conn });
  }

  handleDisconnect(conn: Connection) {
    console.log(`STOMP Client disconnected: ${conn.id}`);
    const client = this.clients.get(conn.id);
    if (client && client.roomId) {
      this.leaveRoom(conn.id, client.roomId);
    }
    this.clients.delete(conn.id);
  }

  handleMessage(conn: Connection, data: string) {
    // Basic STOMP parser
    const validData = data.toString();
    if (!validData || validData === "\n" || validData === "\0") return;

    // Split into command and rest
    const parts = validData.split("\n");
    const command = parts[0];
    
    // Parse headers
    const headers: Record<string, string> = {};
    let bodyIndex = -1;
    for(let i = 1; i < parts.length; i++) {
        if(parts[i] === "") {
            bodyIndex = i + 1;
            break;
        }
        const [k, v] = parts[i].split(":");
        if(k && v) headers[k] = v;
    }

    let body = "";
    if(bodyIndex !== -1 && bodyIndex < parts.length) {
        body = parts.slice(bodyIndex).join("\n").replace(/\0$/, "");
    }

    // Handle Commands
    switch(command) {
        case "CONNECT":
        case "STOMP":
            // Respond with CONNECTED
            this.sendFrame(conn, "CONNECTED", { version: "1.2" });
            break;
        case "SUBSCRIBE":
             // In this simple mock, we track subscription mainly for logging
             // We assume room logic is driven by explicit /pub/studies/enter actions or derived from destination
             if (headers.destination && headers.destination.startsWith("/topic/studies/rooms/")) {
                const afterVal = headers.destination.split("/topic/studies/rooms/")[1];
                const roomId = afterVal.split("/")[0];
                if(roomId) {
                     // Auto-join room concept if needed, or just allow listening
                     // For 'enter' logic, we wait for SEND /pub/studies/enter
                }
             }
             break;
        case "SEND":
             this.handleSendCommand(conn, headers.destination, body);
             break;
    }
  }

  private handleSendCommand(conn: Connection, destination: string, bodyObj: string) {
      if (!destination) return;
      let data: any = {};
      try { data = JSON.parse(bodyObj); } catch(e) {}

      // A. Study Control
      if (destination === "/pub/studies/enter") {
          const roomId = String(data.studyId);
          const userId = String(data.userId || "0"); // Default mock
          
          this.joinRoom(conn.id, roomId, userId);
          
          // Reply: ENTER
          this.broadcastToRoom(roomId, `/topic/studies/rooms/${roomId}`, { type: "ENTER", data: Number(userId) }, conn.id);

          // Reply: ROOM_INFO (Self)
          this.sendFrame(conn, "MESSAGE", { destination: `/topic/studies/${roomId}/info/${userId}`, "content-type":"application/json" }, JSON.stringify({
              type: "ROOM_INFO",
              data: {
                  id: Number(roomId),
                  ownerId: 100,
                  members: [{ userId: Number(userId), nickname: "User" + userId }]
              }
          }));

           // Reply: VIDEO_TOKEN (Self)
           this.sendFrame(conn, "MESSAGE", { destination: `/topic/studies/${roomId}/video-token/${userId}`, "content-type":"application/json" }, JSON.stringify({
              type: "VIDEO_TOKEN",
              data: `wss://mock-openvidu.local/tokens/${roomId}/${userId}`
           }));
      }
      else if (destination === "/pub/studies/leave") {
           const roomId = String(data.studyId);
           const client = this.clients.get(conn.id);
           const uid = client?.userId || "0";

           this.leaveRoom(conn.id, roomId);
           this.broadcastToRoom(roomId, `/topic/studies/rooms/${roomId}`, { type: "LEAVE", data: Number(uid) });
      }
      else if (destination === "/pub/studies/delegate") {
           // { studyId, targetUserId }
           const roomId = String(data.studyId);
           this.broadcastToRoom(roomId, `/topic/studies/rooms/${roomId}`, { type: "DELEGATE", data: data.targetUserId });
      }
      else if (destination === "/pub/studies/kick") {
           // { studyId, targetUserId }
           const roomId = String(data.studyId);
           this.broadcastToRoom(roomId, `/topic/studies/rooms/${roomId}`, { type: "KICK", data: data.targetUserId });
      }
      else if (destination === "/pub/studies/quit") {
           const roomId = String(data.studyId);
           const client = this.clients.get(conn.id);
           const uid = client?.userId || "0";
           this.leaveRoom(conn.id, roomId);
           this.broadcastToRoom(roomId, `/topic/studies/rooms/${roomId}`, { type: "QUIT", data: Number(uid) });
      }
      else if (destination === "/pub/studies/delete") {
           const roomId = String(data.studyId);
           this.broadcastToRoom(roomId, `/topic/studies/rooms/${roomId}`, { type: "DELETE", data: "Room Deleted" });
      }
      else if (destination === "/pub/studies/info/update") {
           const roomId = String(data.studyId);
           this.broadcastToRoom(roomId, `/topic/studies/rooms/${roomId}`, { 
               type: "INFO", 
               data: { title: data.title, description: data.description || "Updated" } 
           });
      }

      // B. Chat
      else if (destination === "/pub/chat/message") {
          // { content, type } - Spec doesn't require roomId in payload for message if inferred, but usually it is.
          // IF payload lacks roomId, we rely on client state. But let's assume client sends it or we use client.roomId
          const client = this.clients.get(conn.id);
          const roomId = client?.roomId; 
          
          if(roomId) {
            const senderName = "User" + (client.userId || "?");
            this.broadcastToRoom(roomId, `/topic/studies/rooms/${roomId}/chat`, {
                type: "CHAT",
                data: {
                    senderName,
                    content: data.content,
                    type: data.type || "TALK",
                    metadata: data.metadata 
                }
            });
          }
      }

      // C. IDE
      else if (destination === "/pub/ide/update") {
          // { problemId, code }
          const client = this.clients.get(conn.id);
          const roomId = client?.roomId;
          const userId = client?.userId;
          
          if(roomId && userId) {
              const topic = `/topic/studies/rooms/${roomId}/ide/${userId}`;
              this.broadcastToRoom(roomId, topic, {
                  type: "IDE",
                  data: {
                      problemId: data.problemId,
                      code: data.code
                  }
              });
          }
      }
      else if (destination === "/pub/ide/watch") {
          // { targetUserId, action }
          const client = this.clients.get(conn.id);
          const roomId = client?.roomId;
          const myId = client?.userId;
          const targetId = data.targetUserId;

          if (roomId && myId && targetId) {
              const watchersTopic = `/topic/studies/rooms/${roomId}/ide/${targetId}/watchers`;
              // Mock logic: just echo back a list containing me
              this.broadcastToRoom(roomId, watchersTopic, {
                  type: "WATCH_UPDATE",
                  data: {
                      count: data.action === "START" ? 1 : 0,
                      viewers: data.action === "START" ? [String(myId)] : []
                  }
              });
          }
      }
      else if (destination === "/pub/ide/request-snapshot") {
          // topic implies target? Spec says payload invalid in table but request says `topic/studies/rooms/{id}/ide/{me}/snapshot`
          // Actually table says: Request Payload: `topic/studies/rooms/{id}/ide/{me}/snapshot` ??
          // That looks like the destination to reply to. Or the payload is the target?
          // Let's assume the payload contains the target or user wants their own snapshot.
          // Simplification: Reply to self with mock data
          const client = this.clients.get(conn.id);
          const roomId = client?.roomId;
          const userId = client?.userId;

          if(roomId && userId) {
             const replyTopic = `/topic/studies/rooms/${roomId}/ide/${userId}/snapshot`;
             this.sendFrame(conn, "MESSAGE", { destination: replyTopic, "content-type":"application/json" }, JSON.stringify({
                 targetUserId: Number(userId),
                 problemId: 1000, 
                 code: "Mock Snapshot Code"
             }));
          }
      }

      // D. Curriculum
      else if (destination === "/pub/studies/problems") {
          // { action: "ADD", problemId }
          const client = this.clients.get(conn.id);
          const roomId = client?.roomId;
          
          if(roomId) {
              const topic = `/topic/studies/rooms/${roomId}/problems`;
              this.broadcastToRoom(roomId, topic, {
                  type: "CURRICULUM",
                  data: {
                      problemId: data.problemId,
                      title: "Added Problem " + data.problemId
                  }
              });
          }
      }

      // E. Whiteboard
      else if (destination === "/pub/studies/whiteboard/message") {
          // { action, objectId, data }
          // Broadcast to /topic/studies/rooms/{id}/whiteboard
           const client = this.clients.get(conn.id);
           const roomId = client?.roomId;
           const userId = client?.userId;
           
           if(roomId) {
               const topic = `/topic/studies/rooms/${roomId}/whiteboard`;
               // Broadcast except sender? Usually whiteboard is echo-back or optimistic. 
               // STOMP usually echoes back unless optimized.
               this.broadcastToRoom(roomId, topic, {
                   action: data.action,
                   objectId: data.objectId,
                   senderId: Number(userId),
                   data: data.data
               }, conn.id); // Exclude sender to avoid double draw if client is optimistic
           }
      }
  }
  
  private joinRoom(connId: string, roomId: string, userId: string) {
      const client = this.clients.get(connId);
      if(client) {
          client.roomId = roomId;
          client.userId = userId;
      }
      if(!this.rooms.has(roomId)) {
          this.rooms.set(roomId, new Set());
      }
      this.rooms.get(roomId)?.add(connId);
      console.log(`User ${userId} joined room ${roomId}`);
  }

  private leaveRoom(connId: string, roomId: string) {
      this.rooms.get(roomId)?.delete(connId);
      console.log(`Connection ${connId} left room ${roomId}`);
  }

  // Broadcast STOMP MESSAGE frame
  private broadcastToRoom(roomId: string, destination: string, body: any, excludeConnId?: string) {
      const room = this.rooms.get(roomId);
      if(!room) return;
      
      const bodyStr = JSON.stringify(body);
      
      room.forEach(cid => {
          if(excludeConnId && cid === excludeConnId) return;
          const client = this.clients.get(cid);
          if(client) {
              this.sendFrame(client.conn, "MESSAGE", { destination, "content-type":"application/json" }, bodyStr);
          }
      });
  }

  private sendFrame(conn: Connection, command: string, headers: Record<string, string> = {}, body: string = "") {
      let frame = `${command}\n`;
      for(const [k, v] of Object.entries(headers)) {
          frame += `${k}:${v}\n`;
      }
      frame += `\n${body}\0`;
      conn.write(frame);
  }

  // Public method to notify room about problem list updates (called from REST API)
  notifyProblemUpdate(studyId: string) {
      const roomId = studyId;
      const topic = `/topic/studies/rooms/${roomId}/problems`;
      this.broadcastToRoom(roomId, topic, {
          type: "CURRICULUM",
          data: { action: "REFRESH" }
      });
  }
}
