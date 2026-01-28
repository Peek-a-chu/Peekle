'use client';

import React, { useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useRoomStore } from '@/domains/study/hooks/useRoomStore';
import {
  WhiteboardCanvas,
  WhiteboardCanvasRef,
} from '@/domains/study/components/whiteboard/WhiteboardCanvas';
import { useWhiteboardSocket, WhiteboardMessage } from '@/domains/study/hooks/useWhiteboardSocket';
import { Pencil, Square, Type, Eraser } from 'lucide-react';
import { cn } from '@/lib/utils';

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

  const handleMessage = useCallback((msg: WhiteboardMessage) => {
    console.log(`[WhiteboardOverlay] Received message:`, msg.action, msg.objectId || '');
    switch (msg.action) {
      case 'ADDED':
        // Pass senderId for color differentiation
        canvasRef.current?.add(msg.data, msg.senderId?.toString());
        break;
      case 'MODIFIED':
        canvasRef.current?.modify(msg.data);
        break;
      case 'REMOVED':
        if (msg.objectId) canvasRef.current?.remove(msg.objectId);
        break;
      case 'CLEAR':
        canvasRef.current?.clear();
        break;
      case 'SYNC':
        console.log(
          `[WhiteboardOverlay] SYNC received: ${msg.data?.history?.length || 0} objects, isActive: ${msg.data?.isActive}`,
        );
        if (msg.data?.history) {
          canvasRef.current?.clear();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          msg.data.history.forEach((action: any) => {
            if (action.action === 'ADDED' && action.data) {
              // Pass senderId from history for color differentiation
              canvasRef.current?.add(action.data, action.senderId?.toString());
            }
          });
        }
        break;
    }
  }, []);

  const { sendMessage } = useWhiteboardSocket(roomId as string, handleMessage, {
    enabled: isWhiteboardOverlayOpen,
  });

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
          />
        </div>
      </div>
    </div>
  );
}

// Backward compatibility export
export const WhiteboardOverlay = WhiteboardPanel;
