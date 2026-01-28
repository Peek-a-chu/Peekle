export type ChatType = 'TALK' | 'CODE' | 'SYSTEM' | 'ENTER' | 'LEAVE';

export interface ChatMessage {
  id?: string; // UUID or timestamp based ID
  roomId: number;
  senderId: number;
  senderName: string;
  content: string;
  type: ChatType;
  parentMessage?: {
    id: string;
    senderId: number;
    senderName: string;
    content: string;
    type: ChatType;
  };
  metadata?: {
    code?: string;
    language?: string;
    problemTitle?: string;
    ownerName?: string;
    [key: string]: unknown;
  };
  createdAt: string;
}
