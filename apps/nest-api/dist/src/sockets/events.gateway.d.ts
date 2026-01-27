import { OnGatewayConnection, OnGatewayDisconnect } from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
export declare class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    server: Server;
    private mockTypingIntervals;
    private sessionStore;
    private userProblemStore;
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
        id?: string;
        roomId: string;
        message: string;
        senderId: number;
        senderName: string;
        type: "TALK" | "CODE" | "SYSTEM";
        parentMessage?: any;
        metadata?: any;
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
        problemId?: number;
    }, client: Socket): void;
    handleLanguageChange(data: {
        roomId: string;
        language: string;
        problemId?: number;
    }, client: Socket): void;
    handleSelectProblem(data: {
        roomId: string;
        problemId: number;
    }, client: Socket): {
        event: string;
        success: boolean;
        problemId: number;
    };
    notifyProblemUpdate(studyId: string): void;
}
