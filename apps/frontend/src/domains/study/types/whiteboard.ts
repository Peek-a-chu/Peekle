export interface WhiteboardMessage {
  action: 'ADDED' | 'MODIFIED' | 'REMOVED' | 'CURSOR' | 'CLEAR' | 'SYNC' | 'START' | 'CLOSE' | 'JOIN';
  objectId?: string;
  data?: any;
  senderId?: string | number;
  senderName?: string;
  roomId?: string;
}
