'use client';

import React, { useRef, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  WhiteboardCanvas,
  WhiteboardCanvasRef,
} from '@/domains/study/components/whiteboard/WhiteboardCanvas';
import { useWhiteboardSocket, WhiteboardMessage } from '@/domains/study/hooks/useWhiteboardSocket';
import { SocketProvider } from '@/domains/study/context/SocketContext';
import {
  Pencil,
  Square,
  Type,
  Eraser,
  Trash2,
  ArrowLeft,
  Users,
  Wifi,
  WifiOff,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

function WhiteboardTestContent() {
  const { id: roomId } = useParams();
  const [activeTool, setActiveTool] = useState<'pen' | 'shape' | 'text' | 'eraser'>('pen');
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string>('Disconnected');
  const [messageLog, setMessageLog] = useState<string[]>([]);
  const canvasRef = useRef<WhiteboardCanvasRef>(null);
  // Mock user ID for testing - in production, this would come from auth
  const currentUserId = '1';

  const addLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setMessageLog((prev) => [`[${timestamp}] ${msg}`, ...prev].slice(0, 50));
  };

  const handleMessage = useCallback((msg: WhiteboardMessage) => {
    addLog(`Received: ${msg.action} ${msg.objectId || ''} from user ${msg.senderId || 'unknown'}`);

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
      case 'START':
        addLog(`Whiteboard started by ${msg.senderName || 'Unknown'}`);
        setIsConnected(true);
        setConnectionStatus('Active');
        break;
      case 'CLOSE':
        addLog('Whiteboard closed');
        setIsConnected(false);
        setConnectionStatus('Closed');
        break;
      case 'SYNC':
        addLog(
          `Sync received: ${msg.data?.history?.length || 0} items, isActive: ${msg.data?.isActive}`,
        );
        if (msg.data?.isActive) {
          setIsConnected(true);
          setConnectionStatus('Active');
        }
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

  const {
    sendMessage,
    isConnected: socketConnected,
    requestSync,
  } = useWhiteboardSocket(roomId as string, handleMessage, { enabled: true });

  const handleRequestSync = () => {
    addLog('Requesting SYNC...');
    requestSync();
  };

  React.useEffect(() => {
    if (socketConnected) {
      setConnectionStatus('Connected');
      addLog('Socket connected');
    } else {
      setConnectionStatus('Disconnected');
    }
  }, [socketConnected]);

  const handleObjectAdded = (obj: any) => {
    const data = obj.toObject ? obj.toObject(['id']) : obj;
    addLog(`Sent: ADDED ${obj.id}`);
    sendMessage({ action: 'ADDED', objectId: obj.id, data });
  };

  const handleObjectModified = (obj: any) => {
    const data = obj.toObject ? obj.toObject(['id']) : obj;
    addLog(`Sent: MODIFIED ${obj.id}`);
    sendMessage({ action: 'MODIFIED', objectId: obj.id, data });
  };

  const handleObjectRemoved = (objectId: string) => {
    addLog(`Sent: REMOVED ${objectId}`);
    sendMessage({ action: 'REMOVED', objectId });
  };

  const handleClearCanvas = () => {
    canvasRef.current?.clear();
    addLog('Sent: CLEAR');
    sendMessage({ action: 'CLEAR' });
  };

  const handleStartWhiteboard = () => {
    addLog('Sent: START');
    sendMessage({ action: 'START' });
    setIsConnected(true);
  };

  const handleCloseWhiteboard = () => {
    addLog('Sent: CLOSE');
    sendMessage({ action: 'CLOSE' });
    setIsConnected(false);
  };

  return (
    <div className="flex h-screen w-full flex-col bg-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-4">
          <Link
            href={`/study/${String(roomId)}`}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="text-sm font-medium">Back to Study Room</span>
          </Link>
          <div className="h-6 w-px bg-gray-300" />
          <h1 className="text-lg font-semibold text-gray-900">Whiteboard Test Page</h1>
          <span className="text-sm text-gray-500">Room #{String(roomId)}</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Connection Status */}
          <div
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium',
              socketConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700',
            )}
          >
            {socketConnected ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
            {connectionStatus}
          </div>

          {/* Action Buttons */}
          <button
            onClick={handleRequestSync}
            disabled={!socketConnected}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              !socketConnected
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-purple-500 text-white hover:bg-purple-600',
            )}
          >
            <RefreshCw className="h-4 w-4" />
            Sync
          </button>
          <button
            onClick={handleStartWhiteboard}
            disabled={isConnected}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              isConnected
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-500 text-white hover:bg-blue-600',
            )}
          >
            Start Session
          </button>
          <button
            onClick={handleCloseWhiteboard}
            disabled={!isConnected}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              !isConnected
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-red-500 text-white hover:bg-red-600',
            )}
          >
            Close Session
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Main Canvas Area */}
        <div className="flex-1 flex flex-col">
          {/* Toolbar */}
          <div className="flex items-center justify-between border-b bg-gray-50 px-4 py-2">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 rounded-lg bg-white p-1 shadow-sm border border-gray-200">
                <button
                  onClick={() => setActiveTool('pen')}
                  className={cn(
                    'rounded p-2 transition-colors hover:bg-gray-100',
                    activeTool === 'pen' ? 'bg-blue-100 text-blue-600' : 'text-gray-600',
                  )}
                  title="Pen Tool"
                >
                  <Pencil className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setActiveTool('shape')}
                  className={cn(
                    'rounded p-2 transition-colors hover:bg-gray-100',
                    activeTool === 'shape' ? 'bg-blue-100 text-blue-600' : 'text-gray-600',
                  )}
                  title="Shape Tool"
                >
                  <Square className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setActiveTool('text')}
                  className={cn(
                    'rounded p-2 transition-colors hover:bg-gray-100',
                    activeTool === 'text' ? 'bg-blue-100 text-blue-600' : 'text-gray-600',
                  )}
                  title="Text Tool"
                >
                  <Type className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setActiveTool('eraser')}
                  className={cn(
                    'rounded p-2 transition-colors hover:bg-gray-100',
                    activeTool === 'eraser' ? 'bg-blue-100 text-blue-600' : 'text-gray-600',
                  )}
                  title="Eraser Tool"
                >
                  <Eraser className="h-5 w-5" />
                </button>
              </div>

              <div className="h-6 w-px bg-gray-300 mx-2" />

              <button
                onClick={handleClearCanvas}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-gray-200 text-red-600 hover:bg-red-50 transition-colors"
                title="Clear Canvas"
              >
                <Trash2 className="h-4 w-4" />
                <span className="text-sm font-medium">Clear All</span>
              </button>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Users className="h-4 w-4" />
              <span>
                Active Tool: <strong className="text-gray-700 capitalize">{activeTool}</strong>
              </span>
            </div>
          </div>

          {/* Canvas */}
          <div className="flex-1 overflow-auto bg-gray-200 p-4">
            <div className="flex h-full w-full items-center justify-center">
              <div className="bg-white rounded-lg shadow-lg">
                <WhiteboardCanvas
                  ref={canvasRef}
                  width={1000}
                  height={700}
                  activeTool={activeTool}
                  currentUserId={currentUserId}
                  onObjectAdded={handleObjectAdded}
                  onObjectModified={handleObjectModified}
                  onObjectRemoved={handleObjectRemoved}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Debug Panel */}
        <div className="w-80 border-l bg-white flex flex-col">
          <div className="border-b px-4 py-3">
            <h2 className="font-semibold text-gray-900">Debug Log</h2>
            <p className="text-xs text-gray-500 mt-1">WebSocket messages and events</p>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            {messageLog.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No messages yet</p>
            ) : (
              <ul className="space-y-1">
                {messageLog.map((log, idx) => (
                  <li
                    key={idx}
                    className="text-xs font-mono text-gray-600 bg-gray-50 px-2 py-1 rounded"
                  >
                    {log}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="border-t px-4 py-3">
            <button
              onClick={() => setMessageLog([])}
              className="w-full px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Clear Log
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Wrapper component to provide Socket context
export default function WhiteboardTestPage() {
  const { id: roomId } = useParams();
  const numericRoomId = Number(roomId) || 1;

  return (
    <SocketProvider roomId={numericRoomId} userId={1}>
      <WhiteboardTestContent />
    </SocketProvider>
  );
}
