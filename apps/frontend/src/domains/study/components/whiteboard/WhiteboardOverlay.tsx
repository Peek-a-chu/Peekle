'use client';

import React, { useRef } from 'react';
import { useParams } from 'next/navigation';
import { useRoomStore } from '@/domains/study/hooks/useRoomStore';
import { WhiteboardCanvas, WhiteboardCanvasRef } from '@/domains/study/components/whiteboard/WhiteboardCanvas';
import { useWhiteboardSocket } from '@/domains/study/hooks/useWhiteboardSocket';
import { Pencil, Square, Type, Eraser, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function WhiteboardOverlay() {
  const { id: roomId } = useParams() as { id: string };
  const isWhiteboardOverlayOpen = useRoomStore((state) => state.isWhiteboardOverlayOpen);
  const setWhiteboardOverlayOpen = useRoomStore((state) => state.setWhiteboardOverlayOpen);
  const [activeTool, setActiveTool] = React.useState<'pen' | 'shape' | 'text' | 'eraser'>('pen');
  const canvasRef = useRef<WhiteboardCanvasRef>(null);

  const lastCursorSend = useRef<number>(0);

  const { sendMessage } = useWhiteboardSocket(roomId, (msg) => {
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
      case 'CURSOR':
        if (msg.senderId && msg.data) {
          canvasRef.current?.updateCursor(msg.senderId, msg.data.x, msg.data.y, msg.senderName);
        }
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
  });

  const handleObjectAdded = (obj: any) => {
    // Include 'id' in serialization
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
  
  const handleCursorMove = (x: number, y: number) => {
    const now = Date.now();
    if (now - lastCursorSend.current > 50) { // Throttle 50ms
      sendMessage({ action: 'CURSOR', data: { x, y } }); 
      lastCursorSend.current = now;
    }
  };

  if (!isWhiteboardOverlayOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative flex h-[85vh] w-[90vw] flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        {/* Header / Toolbar */}
        <div className="flex items-center justify-between border-b bg-gray-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-gray-700">화이트보드</h2>
            
            <div className="ml-6 flex items-center gap-1 rounded-lg bg-white p-1 shadow-sm border border-gray-200">
              <button
                onClick={() => setActiveTool('pen')}
                className={cn(
                  "rounded p-2 transition-colors hover:bg-gray-100",
                  activeTool === 'pen' ? "bg-blue-100 text-blue-600" : "text-gray-600"
                )}
                aria-label="펜"
                title="펜"
              >
                <Pencil className="h-5 w-5" />
              </button>
              <button
                onClick={() => setActiveTool('shape')}
                className={cn(
                  "rounded p-2 transition-colors hover:bg-gray-100",
                  activeTool === 'shape' ? "bg-blue-100 text-blue-600" : "text-gray-600"
                )}
                aria-label="도형"
                title="도형"
              >
                <Square className="h-5 w-5" />
              </button>
              <button
                onClick={() => setActiveTool('text')}
                className={cn(
                  "rounded p-2 transition-colors hover:bg-gray-100",
                  activeTool === 'text' ? "bg-blue-100 text-blue-600" : "text-gray-600"
                )}
                aria-label="텍스트"
                title="텍스트"
              >
                <Type className="h-5 w-5" />
              </button>
              <button
                onClick={() => setActiveTool('eraser')}
                className={cn(
                  "rounded p-2 transition-colors hover:bg-gray-100",
                  activeTool === 'eraser' ? "bg-blue-100 text-blue-600" : "text-gray-600"
                )}
                aria-label="지우개"
                title="지우개"
              >
                <Eraser className="h-5 w-5" />
              </button>
            </div>
          </div>

          <button
            onClick={() => setWhiteboardOverlayOpen(false)}
            className="rounded-full p-2 text-gray-500 hover:bg-gray-200 transition-colors"
            aria-label="닫기"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 overflow-auto bg-gray-100 p-4">
          <div className="flex h-full w-full items-center justify-center">
            <WhiteboardCanvas 
              ref={canvasRef}
              width={1200} 
              height={800} 
              activeTool={activeTool}
              onObjectAdded={handleObjectAdded}
              onObjectModified={handleObjectModified}
              onObjectRemoved={handleObjectRemoved}
              onCursorMove={handleCursorMove}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
