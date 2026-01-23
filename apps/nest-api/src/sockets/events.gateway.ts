import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*', // Allow all for testing, restrict in prod
  },
  namespace: '/study', // separate namespace for study rooms
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    // Handle cleanup (leave room, etc)
    this.server.emit('user-disconnected', client.id);
  }

  @SubscribeMessage('join-room')
  handleJoinRoom(
    @MessageBody() data: { roomId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(data.roomId);
    console.log(`User ${data.userId} joined room ${data.roomId}`);
    
    // Notify others in room
    client.to(data.roomId).emit('user-connected', data.userId);
    
    return { event: 'join-room', success: true };
  }

  @SubscribeMessage('chat-message')
  handleMessage(
    @MessageBody() data: { roomId: string; message: string; sender: string },
    @ConnectedSocket() client: Socket,
  ) {
    this.server.to(data.roomId).emit('chat-message', data);
  }

  // WebRTC Signaling Events
  @SubscribeMessage('offer')
  handleOffer(
    @MessageBody() data: { offer: RTCSessionDescriptionInit; to: string; roomId: string },
    @ConnectedSocket() client: Socket,
  ) {
    console.log(`Sending offer to ${data.to}`);
    client.to(data.to).emit('offer', { offer: data.offer, from: client.id });
  }

  @SubscribeMessage('answer')
  handleAnswer(
    @MessageBody() data: { answer: RTCSessionDescriptionInit; to: string; roomId: string },
    @ConnectedSocket() client: Socket,
  ) {
    console.log(`Sending answer to ${data.to}`);
    client.to(data.to).emit('answer', { answer: data.answer, from: client.id });
  }

  @SubscribeMessage('ice-candidate')
  handleIceCandidate(
    @MessageBody() data: { candidate: RTCIceCandidate; to: string; roomId: string },
    @ConnectedSocket() client: Socket,
  ) {
    console.log(`Sending ice-candidate to ${data.to}`);
    client.to(data.to).emit('ice-candidate', { candidate: data.candidate, from: client.id });
  }
}
