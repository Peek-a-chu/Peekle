'use client';

import React, { useRef, useCallback, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useRoomStore } from '@/domains/study/hooks/useRoomStore';
import {
  WhiteboardCanvas,
  WhiteboardCanvasRef,
} from '@/domains/study/components/whiteboard/WhiteboardCanvas';
import { useWhiteboardSocket } from '@/domains/study/hooks/useWhiteboardSocket';
import { WhiteboardMessage } from '@/domains/study/types/whiteboard';
import { Pencil, Square, Type, Eraser } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSocketContext } from '@/domains/study/context/SocketContext';

interface WhiteboardPanelProps {
  className?: string;
}

export function WhiteboardPanel({ className }: WhiteboardPanelProps) {
  const { id: roomId } = useParams();
  const isWhiteboardOverlayOpen = useRoomStore((state) => state.isWhiteboardOverlayOpen);
  const selectedProblemId = useRoomStore((state) => state.selectedProblemId);
  const selectedProblemTitle = useRoomStore((state) => state.selectedProblemTitle);
  const currentUserId = useRoomStore((state) => state.currentUserId);
  const [activeTool, setActiveTool] = React.useState<'pen' | 'shape' | 'text' | 'eraser'>('pen');
  const canvasRef = useRef<WhiteboardCanvasRef>(null);
  const { connected } = useSocketContext();

  const handleMessage = useCallback((msg: WhiteboardMessage) => {
    console.log(`[WhiteboardOverlay] Received message:`, msg.action, msg.objectId || '');
    canvasRef.current?.handleServerMessage(msg);
  }, []);

  const { sendMessage } = useWhiteboardSocket(
    roomId as string,
    currentUserId?.toString() || '',
    handleMessage,
    {
      enabled: isWhiteboardOverlayOpen,
    },
  );

  const hasJoinedRef = useRef(false);

  // Reset join status when whiteboard is closed
  useEffect(() => {
    if (!isWhiteboardOverlayOpen) {
      // Reset when whiteboard is closed so SYNC will be requested again when reopened
      hasJoinedRef.current = false;
    }
  }, [isWhiteboardOverlayOpen]);

  // Reset join status on disconnect
  useEffect(() => {
    if (!connected) {
      hasJoinedRef.current = false;
    }
  }, [connected]);

  // Note:
  // SYNC 요청은 `useWhiteboardSocket`에서 "구독 완료 후 자동 SYNC"로 처리합니다.
  // Overlay에서 추가로 setTimeout SYNC를 보내면, overlay on/off 및 재연결 타이밍에서
  // 세션 종료 후 늦게 publish 되는 레이스로 서버에 "No decoder for session id" 로그가 발생할 수 있어 제거했습니다.
  const handleCanvasReady = useCallback(() => {
    console.log('[WhiteboardOverlay] Canvas ready');
  }, []);

  // [Fix] Request initial state when connected and whiteboard is open
  useEffect(() => {
    if (isWhiteboardOverlayOpen && connected && !hasJoinedRef.current) {
      console.log('[WhiteboardOverlay] Sending JOIN request');
      sendMessage({ action: 'JOIN' });
      hasJoinedRef.current = true;
    }
  }, [isWhiteboardOverlayOpen, connected, sendMessage]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleObjectAdded = useCallback(
    (obj: any) => {
      const data = obj.toObject ? obj.toObject(['id']) : obj;
      sendMessage({ action: 'ADDED', objectId: obj.id, data });
    },
    [sendMessage],
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleObjectModified = useCallback(
    (obj: any) => {
      const data = obj.toObject ? obj.toObject(['id']) : obj;
      sendMessage({ action: 'MODIFIED', objectId: obj.id, data });
    },
    [sendMessage],
  );

  const handleObjectRemoved = useCallback(
    (objectId: string) => {
      sendMessage({ action: 'REMOVED', objectId });
    },
    [sendMessage],
  );

  if (!isWhiteboardOverlayOpen) {
    return null;
  }

  return (
    <div className={cn('flex h-full w-full flex-col bg-white', className)}>
      {/* Header / Toolbar */}
      <div className="flex items-center justify-between border-b bg-gray-50 px-3 py-2 shrink-0">
        <div className="flex items-center gap-2">
          <div className="ml-4 flex items-center gap-1 rounded-lg bg-white p-1 shadow-sm border border-gray-200">
            <button
              onClick={() => setActiveTool('pen')}
              className={cn(
                'rounded p-1.5 transition-colors hover:bg-gray-100',
                activeTool === 'pen' ? 'bg-blue-100 text-blue-600' : 'text-gray-600',
              )}
              aria-label="펜"
              title="펜"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={() => setActiveTool('shape')}
              className={cn(
                'rounded p-1.5 transition-colors hover:bg-gray-100',
                activeTool === 'shape' ? 'bg-blue-100 text-blue-600' : 'text-gray-600',
              )}
              aria-label="도형"
              title="도형"
            >
              <Square className="h-4 w-4" />
            </button>
            <button
              onClick={() => setActiveTool('text')}
              className={cn(
                'rounded p-1.5 transition-colors hover:bg-gray-100',
                activeTool === 'text' ? 'bg-blue-100 text-blue-600' : 'text-gray-600',
              )}
              aria-label="텍스트"
              title="텍스트"
            >
              <Type className="h-4 w-4" />
            </button>
            <button
              onClick={() => setActiveTool('eraser')}
              className={cn(
                'rounded p-1.5 transition-colors hover:bg-gray-100',
                activeTool === 'eraser' ? 'bg-blue-100 text-blue-600' : 'text-gray-600',
              )}
              aria-label="지우개"
              title="지우개"
            >
              <Eraser className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Selected Problem Info */}
        {selectedProblemId && selectedProblemTitle && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-gray-200 shadow-sm">
            <span className="text-sm font-medium text-blue-600">#{selectedProblemId}</span>
            <span className="text-sm text-gray-700 truncate max-w-[200px]">
              {selectedProblemTitle}
            </span>
          </div>
        )}
      </div>

      {/* Canvas Area */}
      <div className="flex-1 overflow-auto bg-gray-100 p-2 min-h-0">
        <div className="flex h-full w-full items-center justify-center">
          <WhiteboardCanvas
            ref={canvasRef}
            width={800}
            height={600}
            activeTool={activeTool}
            currentUserId={currentUserId?.toString()}
            onObjectAdded={handleObjectAdded}
            onObjectModified={handleObjectModified}
            onObjectRemoved={handleObjectRemoved}
            onReady={handleCanvasReady}
          />
        </div>
      </div>
    </div>
  );
}

// Backward compatibility export
export const WhiteboardOverlay = WhiteboardPanel;
