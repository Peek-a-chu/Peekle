'use client';

import React, {
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
  useState,
  useCallback,
} from 'react';
import { USER_COLORS } from '@/lib/constants';
import { WhiteboardMessage } from '@/domains/study/types/whiteboard';

export interface WhiteboardCanvasRef {
  add: (objData: any, senderId?: string) => void;
  modify: (objData: any) => void;
  remove: (objectId: string) => void;
  clear: () => void;
  handleServerMessage: (message: WhiteboardMessage) => void;
}

interface WhiteboardCanvasProps {
  width?: number;
  height?: number;
  activeTool?: 'pen' | 'shape' | 'text' | 'eraser';
  currentUserId?: string;
  onObjectAdded?: (obj: any) => void;
  onObjectModified?: (obj: any) => void;
  onObjectRemoved?: (objectId: string) => void;
}

export const WhiteboardCanvas = forwardRef<WhiteboardCanvasRef, WhiteboardCanvasProps>(
  (
    {
      width = 800,
      height = 600,
      activeTool = 'pen',
      currentUserId,
      onObjectAdded,
      onObjectModified,
      onObjectRemoved,
    },
    ref,
  ) => {
    const canvasEl = useRef<HTMLCanvasElement>(null);
    const fabricCanvasRef = useRef<any>(null);
    const fabricRef = useRef<any>(null);
    const [isFabricLoaded, setIsFabricLoaded] = useState(false);
    const messageQueueRef = useRef<WhiteboardMessage[]>([]);

    // Map to track user colors for consistent coloring
    const userColorsRef = useRef<Map<string, string>>(new Map());

    // Get or assign a color for a user
    const getUserColor = (userId: string): string => {
      if (!userColorsRef.current.has(userId)) {
        const usedColors = new Set(userColorsRef.current.values());
        const availableColor =
          USER_COLORS.find((c) => !usedColors.has(c)) ||
          USER_COLORS[userColorsRef.current.size % USER_COLORS.length];
        userColorsRef.current.set(userId, availableColor);
      }
      return userColorsRef.current.get(userId)!;
    };

    // Store callbacks in refs to avoid stale closures and unnecessary re-renders
    const onObjectAddedRef = useRef(onObjectAdded);
    const onObjectModifiedRef = useRef(onObjectModified);
    const onObjectRemovedRef = useRef(onObjectRemoved);

    // Keep refs updated with latest callbacks
    useEffect(() => {
      onObjectAddedRef.current = onObjectAdded;
    }, [onObjectAdded]);

    useEffect(() => {
      onObjectModifiedRef.current = onObjectModified;
    }, [onObjectModified]);

    useEffect(() => {
      onObjectRemovedRef.current = onObjectRemoved;
    }, [onObjectRemoved]);

    // Helper to ensure ID
    const ensureId = (obj: any) => {
      if (!obj.id) {
        obj.id = crypto.randomUUID();
      }
      return obj.id;
    };

    // 내부 액션 처리 함수 (재사용을 위해 분리)
    const handleAction = useCallback(
      (action: string, objectId: string | undefined, data: any, senderId: string | undefined) => {
        if (!fabricCanvasRef.current || !fabricRef.current) return;
        const canvas = fabricCanvasRef.current;
        const fabric = fabricRef.current;

        switch (action) {
          case 'ADDED':
            if (data) {
              const isOtherUser =
                senderId !== undefined &&
                senderId !== null &&
                currentUserId &&
                String(senderId) !== String(currentUserId);
              const userColor = isOtherUser ? getUserColor(String(senderId)) : null;

              // [Critical Fix] Clone data to ensure it's mutable and clean for Fabric
              const objectData = JSON.parse(JSON.stringify(data));

              const addObjectsToCanvas = (objects: any[]) => {
                if (!objects || objects.length === 0) return;
                objects.forEach((o) => {
                  // [Fix] Restore ID from data as enlivenObjects doesn't auto-restore custom props
                  if (objectData.id) {
                    o.id = objectData.id;
                  }

                  if (userColor) {
                    if (o.type === 'path' || o.type === 'rect') {
                      o.set('stroke', userColor);
                    } else if (o.type === 'i-text' || o.type === 'text') {
                      o.set('fill', userColor);
                    }
                  }
                  if (senderId !== undefined && senderId !== null) {
                    o.senderId = senderId;
                  }
                  o.setCoords();
                  // 중복 추가 방지
                  const exists = canvas.getObjects().find((existing: any) => existing.id === o.id);
                  if (!exists) {
                    canvas.add(o);
                  }
                });
                canvas.renderAll();
              };

              // Handle both Callback (v5) and Promise (v6)
              const enlivener = fabric.util.enlivenObjects([objectData], addObjectsToCanvas);
              if (enlivener && typeof enlivener.then === 'function') {
                enlivener.then(addObjectsToCanvas);
              }
            }
            break;
          case 'MODIFIED':
            if (objectId) {
              const obj = canvas.getObjects().find((o: any) => o.id === objectId);
              if (obj) {
                obj.set(data);
                obj.setCoords();
                canvas.requestRenderAll();
              }
            }
            break;
          case 'REMOVED':
            if (objectId) {
              const obj = canvas.getObjects().find((o: any) => o.id === objectId);
              if (obj) {
                canvas.remove(obj);
                canvas.requestRenderAll();
              }
            }
            break;
          case 'CLEAR':
            canvas.clear();
            break;
        }
      },
      [currentUserId],
    );

    const processMessage = useCallback(
      (message: WhiteboardMessage) => {
        const { action, objectId, data, senderId } = message;
        if (action === 'SYNC') {
          // 초기 동기화: history 배열 처리
          if (data && Array.isArray(data.history)) {
            handleAction('CLEAR', undefined, undefined, undefined);

            const history = data.history as WhiteboardMessage[];
            // ADDED 이벤트와 그 외 이벤트를 분리
            const addedEvents = history.filter((h) => h.action === 'ADDED' && h.data);
            const otherEvents = history.filter((h) => h.action !== 'ADDED');

            // 1. 모든 객체를 한 번에 복원 (비동기 순서 보장)
            if (addedEvents.length > 0 && fabricRef.current) {
              const fabricDataList = addedEvents.map((h) =>
                JSON.parse(JSON.stringify(h.data || {})),
              );

              const addHistoryToCanvas = (objects: any[]) => {
                const canvas = fabricCanvasRef.current;
                if (!canvas) return;

                objects.forEach((o, i) => {
                  const event = addedEvents[i];
                  const eventData = fabricDataList[i];
                  // ID 및 속성 복구
                  if (eventData.id) o.id = eventData.id;
                  if (event.senderId) o.senderId = event.senderId;

                  // 색상 적용 로직
                  const isOtherUser =
                    event.senderId !== undefined &&
                    event.senderId !== null &&
                    currentUserId &&
                    String(event.senderId) !== String(currentUserId);
                  const userColor = isOtherUser ? getUserColor(String(event.senderId)) : null;

                  if (userColor) {
                    if (o.type === 'path' || o.type === 'rect') o.set('stroke', userColor);
                    else if (o.type === 'i-text' || o.type === 'text') o.set('fill', userColor);
                  }
                  o.setCoords();
                  canvas.add(o);
                });

                // 2. 객체 추가 완료 후 나머지 이벤트(수정, 삭제 등) 처리
                otherEvents.forEach((msg) => {
                  handleAction(msg.action, msg.objectId, msg.data, msg.senderId?.toString());
                });
                canvas.renderAll();
              };

              // Handle both Callback (v5) and Promise (v6)
              const enlivener = fabricRef.current.util.enlivenObjects(
                fabricDataList,
                addHistoryToCanvas,
              );
              if (enlivener && typeof enlivener.then === 'function') {
                enlivener.then(addHistoryToCanvas);
              }
            } else {
              // 추가된 객체가 없으면 나머지 이벤트만 처리
              otherEvents.forEach((msg) => {
                handleAction(msg.action, msg.objectId, msg.data, msg.senderId?.toString());
              });
            }
          }
        } else {
          handleAction(action, objectId, data, senderId?.toString());
        }
      },
      [handleAction, currentUserId],
    );

    useImperativeHandle(ref, () => ({
      add: (objData: any, senderId?: string) =>
        handleAction('ADDED', objData.id, objData, senderId),
      modify: (objData: any) => handleAction('MODIFIED', objData.id, objData, undefined),
      remove: (objectId: string) => handleAction('REMOVED', objectId, undefined, undefined),
      clear: () => handleAction('CLEAR', undefined, undefined, undefined),
      handleServerMessage: (message: WhiteboardMessage) => {
        if (!isFabricLoaded || !fabricCanvasRef.current) {
          messageQueueRef.current.push(message);
          return;
        }
        processMessage(message);
      },
    }));

    useEffect(() => {
      if (!canvasEl.current) return;

      let canvas: any;
      let isMounted = true;

      const initFabric = async () => {
        try {
          const mod = await import('fabric');
          // fabric v5 compatibility: handle different export styles
          const fabric = mod.fabric || mod.default || mod;

          if (!isMounted) return;

          fabricRef.current = fabric;

          // [Fix] Ensure fabric is available globally for enlivenObjects to work correctly
          if (typeof window !== 'undefined') {
            (window as any).fabric = fabric;
          }

          // Initialize fabric canvas
          canvas = new fabric.Canvas(canvasEl.current, {
            width,
            height,
            backgroundColor: '#ffffff',
          });

          fabricCanvasRef.current = canvas;

          // Initialize freeDrawingBrush for pen tool
          if (!canvas.freeDrawingBrush) {
            canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
          }
          canvas.freeDrawingBrush.width = 3;
          canvas.freeDrawingBrush.color = '#000000';

          // Core Event Listeners - use refs to always call latest callbacks
          canvas.on('path:created', (e: any) => {
            if (e.path) {
              ensureId(e.path);
              onObjectAddedRef.current?.(e.path);
            }
          });

          canvas.on('object:modified', (e: any) => {
            if (e.target) {
              onObjectModifiedRef.current?.(e.target);
            }
          });

          // Initial State - don't set isDrawingMode here, let the tool effect handle it
          setIsFabricLoaded(true);
        } catch (err) {
          console.error('Failed to load fabric', err);
        }
      };

      initFabric();

      // Cleanup
      return () => {
        isMounted = false;
        if (canvas) {
          canvas.dispose();
        }
        fabricCanvasRef.current = null;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [width, height]);

    // Process queued messages when fabric is loaded
    useEffect(() => {
      if (isFabricLoaded && messageQueueRef.current.length > 0) {
        messageQueueRef.current.forEach((msg) => processMessage(msg));
        messageQueueRef.current = [];
      }
    }, [isFabricLoaded, processMessage]);

    // Updates when tool changes
    const mouseDownHandlerRef = useRef<((opt: any) => void) | null>(null);

    useEffect(() => {
      if (!fabricCanvasRef.current || !fabricRef.current || !isFabricLoaded) return;
      const canvas = fabricCanvasRef.current;
      const fabric = fabricRef.current;

      // Cleanup previous event listener first
      if (mouseDownHandlerRef.current) {
        canvas.off('mouse:down', mouseDownHandlerRef.current);
        mouseDownHandlerRef.current = null;
      }

      // Reset canvas state completely
      canvas.isDrawingMode = false;
      canvas.selection = true;
      canvas.defaultCursor = 'default';
      canvas.hoverCursor = 'move';

      // Deselect all objects and render to apply changes
      canvas.discardActiveObject();
      canvas.renderAll();

      let handler: ((opt: any) => void) | null = null;

      if (activeTool === 'pen') {
        canvas.isDrawingMode = true;
        // Ensure freeDrawingBrush exists before setting properties
        if (!canvas.freeDrawingBrush) {
          canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
        }
        canvas.freeDrawingBrush.width = 3;
        canvas.freeDrawingBrush.color = '#000000';
      } else if (activeTool === 'eraser') {
        canvas.defaultCursor = 'crosshair';
        canvas.hoverCursor = 'crosshair';
        canvas.selection = false;

        handler = (opt) => {
          if (opt.target) {
            const targetId = opt.target.id;
            canvas.remove(opt.target);
            canvas.requestRenderAll();
            if (targetId) onObjectRemovedRef.current?.(targetId);
          }
        };
      } else if (activeTool === 'shape') {
        canvas.selection = false;
        canvas.defaultCursor = 'crosshair';

        handler = (opt) => {
          if (opt.target) return;
          const pointer = canvas.getPointer(opt.e);
          const rect = new fabric.Rect({
            left: pointer.x,
            top: pointer.y,
            fill: 'transparent',
            stroke: '#000000',
            strokeWidth: 2,
            width: 100,
            height: 100,
          });
          rect.id = crypto.randomUUID();
          canvas.add(rect);
          canvas.setActiveObject(rect);
          canvas.requestRenderAll();
          onObjectAddedRef.current?.(rect);
        };
      } else if (activeTool === 'text') {
        canvas.selection = false;
        canvas.defaultCursor = 'text';

        handler = (opt) => {
          if (opt.target) return;
          const pointer = canvas.getPointer(opt.e);
          const text = new fabric.IText('텍스트 입력', {
            left: pointer.x,
            top: pointer.y,
            fontFamily: 'Arial',
            fill: '#333333',
            fontSize: 20,
          });
          text.id = crypto.randomUUID();
          canvas.add(text);
          canvas.setActiveObject(text);
          text.enterEditing();
          canvas.requestRenderAll();
          onObjectAddedRef.current?.(text);
        };
      }

      if (handler) {
        canvas.on('mouse:down', handler);
        mouseDownHandlerRef.current = handler;
      }

      canvas.requestRenderAll();

      // Cleanup function to remove handler when tool changes or component unmounts
      return () => {
        if (mouseDownHandlerRef.current) {
          canvas.off('mouse:down', mouseDownHandlerRef.current);
          mouseDownHandlerRef.current = null;
        }
      };
    }, [activeTool, isFabricLoaded]);

    // Special listener for Text editing exit to trigger modification update
    useEffect(() => {
      if (!fabricCanvasRef.current || !isFabricLoaded) return;
      const canvas = fabricCanvasRef.current;

      const textHandler = (e: any) => {
        onObjectModifiedRef.current?.(e.target);
      };

      canvas.on('text:editing:exited', textHandler);
      return () => {
        canvas.off('text:editing:exited', textHandler);
      };
    }, [isFabricLoaded]);

    return (
      <div className="relative border border-gray-200 shadow-sm">
        <canvas ref={canvasEl} />
      </div>
    );
  },
);

WhiteboardCanvas.displayName = 'WhiteboardCanvas';
