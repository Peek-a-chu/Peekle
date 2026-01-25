import { OnGatewayConnection, OnGatewayDisconnect } from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
export declare class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    server: Server;
    private mockTypingIntervals;
    private sessionStore;
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): void;
    handleJoinRoom(data: {
        roomId: string;
        userId: string;
    }, client: Socket): {
        event: string;
        success: boolean;
    };
    handleMessage(data: {
        roomId: string;
        message: string;
        sender: string;
    }, client: Socket): void;
    handleRequestCode(data: {
        roomId: string;
        targetUserId: number;
    }, client: Socket): void;
    handleOffer(data: {
        offer: RTCSessionDescriptionInit;
        to: string;
        roomId: string;
    }, client: Socket): void;
    handleAnswer(data: {
        answer: RTCSessionDescriptionInit;
        to: string;
        roomId: string;
    }, client: Socket): void;
    handleIceCandidate(data: {
        candidate: RTCIceCandidate;
        to: string;
        roomId: string;
    }, client: Socket): void;
    handleCodeChange(data: {
        roomId: string;
        code: string;
    }, client: Socket): void;
    handleLanguageChange(data: {
        roomId: string;
        language: string;
    }, client: Socket): void;
}
