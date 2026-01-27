'use client';

import React, { useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useRoomStore } from '@/domains/study/hooks/useRoomStore';
import {
  WhiteboardCanvas,
  WhiteboardCanvasRef,
} from '@/domains/study/components/whiteboard/WhiteboardCanvas';
import { useWhiteboardSocket, WhiteboardMessage } from '@/domains/study/hooks/useWhiteboardSocket';
import { Pencil, Square, Type, Eraser, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WhiteboardPanelProps {
  className?: string;
}

export function WhiteboardPanel({ className }: WhiteboardPanelProps) {
  const { id: roomId } = useParams();
  const isWhiteboardOverlayOpen = useRoomStore((state) => state.isWhiteboardOverlayOpen);
  const setWhiteboardOverlayOpen = useRoomStore((state) => state.setWhiteboardOverlayOpen);
  const selectedProblemId = useRoomStore((state) => state.selectedProblemId);
  const selectedProblemTitle = useRoomStore((state) => state.selectedProblemTitle);
  const [activeTool, setActiveTool] = React.useState<'pen' | 'shape' | 'text' | 'eraser'>('pen');
  const canvasRef = useRef<WhiteboardCanvasRef>(null);

  const handleMessage = useCallback((msg: WhiteboardMessage) => {
    switch (msg.action) {
      case 'ADDED':
        canvasRef.current?.add(msg.data);
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
        if (msg.data?.history) {
          canvasRef.current?.clear();
          msg.data.history.forEach((action: any) => {
            if (action.action === 'ADDED' && action.data) {
              canvasRef.current?.add(action.data);
            }
          });
        }
        break;
    }
  }, []);

  const { sendMessage } = useWhiteboardSocket(roomId as string, handleMessage, {
    enabled: isWhiteboardOverlayOpen,
  });

  const handleObjectAdded = (obj: any) => {
    const data = obj.toObject ? obj.toObject(['id']) : obj;
    sendMessage({ action: 'ADDED', objectId: obj.id, data });
  };

  const handleObjectModified = (obj: any) => {
    const data = obj.toObject ? obj.toObject(['id']) : obj;
    sendMessage({ action: 'MODIFIED', objectId: obj.id, data });
  };

  const handleObjectRemoved = (objectId: string) => {
    sendMessage({ action: 'REMOVED', objectId });
  };

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
            <span className="text-sm text-gray-700 truncate max-w-[200px]">{selectedProblemTitle}</span>
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
