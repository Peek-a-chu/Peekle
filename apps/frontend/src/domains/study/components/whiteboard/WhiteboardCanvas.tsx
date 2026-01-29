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
import { getDeterministicUserColor, isBlankText } from '@/domains/study/utils/whiteboard';

export interface WhiteboardCanvasRef {
  add: (objData: any, senderId?: string) => void;
  modify: (objData: any) => void;
  remove: (objectId: string) => void;
  clear: () => void;
  handleServerMessage: (message: WhiteboardMessage) => void;
  isReady: () => boolean;
}

interface WhiteboardCanvasProps {
  width?: number;
  height?: number;
  activeTool?: 'select' | 'pen' | 'shape' | 'text' | 'eraser' | string;
  currentUserId?: string | number;
  onObjectAdded?: (obj: any) => void;
  onObjectModified?: (obj: any) => void;
  onObjectRemoved?: (objectId: string) => void;
  onReady?: () => void;
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
      onReady,
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

    // Track newly created text objects that should not be broadcast until user confirms input
    const pendingTextIdsRef = useRef<Set<string>>(new Set());

    // Get or assign a color for a user (Deterministic based on ID)
    const getUserColor = (userId: string): string => {
      const cached = userColorsRef.current.get(userId);
      if (cached) return cached;
      const color = getDeterministicUserColor(userId, USER_COLORS);
      userColorsRef.current.set(userId, color);
      return color;
    };

    const applyUserColorToObject = (obj: any, userColor: string | null) => {
      if (!userColor || !obj?.set) return;
      // [Fix] Skip images to prevent coloring code screenshots or other images
      if (obj.type === 'image') return;
      // Text
      if (obj.type === 'i-text' || obj.type === 'text') {
        obj.set('fill', userColor);
        return;
      }
      // Groups (apply to children)
      if (obj.type === 'group' && Array.isArray(obj._objects)) {
        obj._objects.forEach((child: any) => applyUserColorToObject(child, userColor));
        return;
      }

      // Shapes/paths (be liberal: many Fabric objects support stroke/fill)
      if ('stroke' in obj) {
        obj.set('stroke', userColor);
      } else if ('fill' in obj) {
        obj.set('fill', userColor);
      }
    };

    // Store callbacks in refs to avoid stale closures and unnecessary re-renders
    const onObjectAddedRef = useRef(onObjectAdded);
    const onObjectModifiedRef = useRef(onObjectModified);
    const onObjectRemovedRef = useRef(onObjectRemoved);
    const onReadyRef = useRef(onReady);

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

    useEffect(() => {
      onReadyRef.current = onReady;
    }, [onReady]);

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
              const normalizedSenderId =
                senderId !== undefined && senderId !== null ? String(senderId) : null;
              const normalizedCurrentUserId =
                currentUserId !== undefined && currentUserId !== null ? String(currentUserId) : null;

              // If currentUserId is unknown, treat sender as "other" so we still color remote objects.
              const isSelf =
                normalizedSenderId &&
                normalizedCurrentUserId &&
                normalizedSenderId === normalizedCurrentUserId;
              const userColor =
                normalizedSenderId && !isSelf ? getUserColor(normalizedSenderId) : null;

              // [Critical Fix] Clone data to ensure it's mutable and clean for Fabric
              const objectData = JSON.parse(JSON.stringify(data));

              const addObjectsToCanvas = (objects: any[]) => {
                if (!objects || objects.length === 0) return;
                objects.forEach((o) => {
                  // [Fix] Restore ID from data as enlivenObjects doesn't auto-restore custom props
                  if (objectData.id) {
                    o.id = objectData.id;
                  }
                  // [Fix] Restore custom properties that enlivenObjects might have missed
                  Object.keys(objectData).forEach((key) => {
                    if (o[key] === undefined) {
                      o[key] = objectData[key];
                    }
                  });

                  applyUserColorToObject(o, userColor);
                  if (normalizedSenderId) {
                    o.senderId = normalizedSenderId;
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
            // [Fix] Use manual cleanup instead of canvas.clear() to avoid 'fire' undefined error
            canvas.discardActiveObject();
            canvas.getObjects().slice().forEach((obj: any) => {
              canvas.remove(obj);
            });
            canvas.backgroundImage = null;
            canvas.overlayImage = null;
            canvas.setBackgroundColor('#ffffff', () => canvas.renderAll());
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
            
            // [Fix] Handle history with CLEAR events: only process events after the last CLEAR
            const lastClearIndex = history.map(h => h.action).lastIndexOf('CLEAR');
            const effectiveHistory = lastClearIndex !== -1 ? history.slice(lastClearIndex + 1) : history;

            // ADDED 이벤트와 그 외 이벤트를 분리
            const addedEvents = effectiveHistory.filter((h) => h.action === 'ADDED' && h.data);
            const otherEvents = effectiveHistory.filter((h) => h.action !== 'ADDED');

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

                  // [Fix] Restore custom properties
                  Object.keys(eventData).forEach((key) => {
                    if (o[key] === undefined) {
                      o[key] = eventData[key];
                    }
                  });

                  if (event.senderId !== undefined && event.senderId !== null) {
                    o.senderId = event.senderId;
                  }

                  // 색상 적용 로직
                  const normalizedSenderId =
                    event.senderId !== undefined && event.senderId !== null
                      ? String(event.senderId)
                      : null;
                  const normalizedCurrentUserId =
                    currentUserId !== undefined && currentUserId !== null ? String(currentUserId) : null;
                  const isSelf =
                    normalizedSenderId &&
                    normalizedCurrentUserId &&
                    normalizedSenderId === normalizedCurrentUserId;
                  const userColor =
                    normalizedSenderId && !isSelf ? getUserColor(normalizedSenderId) : null;

                  applyUserColorToObject(o, userColor);
                  o.setCoords();
                  
                  // [Fix] Prevent duplicates
                  const exists = canvas.getObjects().find((existing: any) => existing.id === o.id);
                  if (!exists) {
                    canvas.add(o);
                  }
                });

                // 2. 객체 추가 완료 후 나머지 이벤트(수정, 삭제 등) 처리
                otherEvents.forEach((msg) => {
                  handleAction(msg.action, msg.objectId, msg.data, msg.senderId?.toString());
                });
                canvas.requestRenderAll();
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
          } else if (data && (Array.isArray(data) || Array.isArray(data.objects))) {
            // [New] Handle direct object list (Snapshot) for full sync
            handleAction('CLEAR', undefined, undefined, undefined);
            const rawObjects = Array.isArray(data) ? data : data.objects;
            const objectsData = JSON.parse(JSON.stringify(rawObjects));

            if (fabricRef.current && objectsData.length > 0) {
              const addObjectsToCanvas = (objects: any[]) => {
                const canvas = fabricCanvasRef.current;
                if (!canvas) return;

                objects.forEach((o, i) => {
                  const objData = objectsData[i];
                  if (objData.id) o.id = objData.id;

                  // [Fix] Restore custom properties
                  Object.keys(objData).forEach((key) => {
                    if (o[key] === undefined) {
                      o[key] = objData[key];
                    }
                  });

                  if (objData.senderId !== undefined && objData.senderId !== null) {
                    o.senderId = objData.senderId;
                  }

                  const objectSenderId = o.senderId;
                  const normalizedSenderId =
                    objectSenderId !== undefined && objectSenderId !== null
                      ? String(objectSenderId)
                      : null;
                  const normalizedCurrentUserId =
                    currentUserId !== undefined && currentUserId !== null ? String(currentUserId) : null;
                  const isSelf =
                    normalizedSenderId &&
                    normalizedCurrentUserId &&
                    normalizedSenderId === normalizedCurrentUserId;
                  const userColor =
                    normalizedSenderId && !isSelf ? getUserColor(normalizedSenderId) : null;

                  applyUserColorToObject(o, userColor);

                  o.setCoords();
                  canvas.add(o);
                });
                canvas.requestRenderAll();
              };

              const enlivener = fabricRef.current.util.enlivenObjects(objectsData, addObjectsToCanvas);
              if (enlivener && typeof enlivener.then === 'function') {
                enlivener.then(addObjectsToCanvas);
              }
            }
          }
        } else {
          // [New] Ignore echo messages from self (Optimistic UI update is already applied)
          if (
            currentUserId &&
            senderId &&
            String(senderId) === String(currentUserId) &&
            ['ADDED', 'MODIFIED', 'REMOVED'].includes(action)
          ) {
            return;
          }
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
      isReady: () => isFabricLoaded && !!fabricCanvasRef.current,
    }));

    useEffect(() => {
      if (!canvasEl.current) return;

      let canvas: any;
      let isMounted = true;

      const initFabric = async () => {
        try {
          console.log('[WhiteboardCanvas] Starting fabric init...');
          const mod = await import('fabric');
          console.log('[WhiteboardCanvas] Fabric module loaded');
          
          // fabric v5 compatibility: handle different export styles
          const fabric = mod.fabric || mod.default || mod;

          if (!isMounted) return;

          fabricRef.current = fabric;

          // [Fix] Ensure fabric is available globally for enlivenObjects to work correctly
          if (typeof window !== 'undefined') {
            (window as any).fabric = fabric;
            console.log('[WhiteboardCanvas] Exposing fabricCanvas to window');
          }

          // Initialize fabric canvas
          canvas = new fabric.Canvas(canvasEl.current, {
            width,
            height,
            backgroundColor: '#ffffff',
          });
          
          if (typeof window !== 'undefined') {
             (window as any).fabricCanvas = canvas;
          }

          fabricCanvasRef.current = canvas;
          console.log('[WhiteboardCanvas] Canvas initialized');

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
          
          // Notify parent that canvas is ready
          if (onReadyRef.current) {
            onReadyRef.current();
          }
        } catch (err) {
          console.error('Failed to load fabric', err);
        }
      };

      initFabric();

      // Cleanup
      return () => {
        isMounted = false;
        setIsFabricLoaded(false);
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

      // [Fix] Recalculate offset to ensure pointer coordinates are accurate
      canvas.calcOffset();

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
      
      // Determine user color
      const myColor = '#000000';

      if (activeTool === 'select') {
        canvas.isDrawingMode = false;
        canvas.selection = true;
        canvas.defaultCursor = 'default';
        canvas.hoverCursor = 'move';
      } else if (activeTool === 'pen') {
        canvas.isDrawingMode = true;
        // Ensure freeDrawingBrush exists before setting properties
        if (!canvas.freeDrawingBrush) {
          canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
        }
        canvas.freeDrawingBrush.width = 3;
        canvas.freeDrawingBrush.color = myColor;
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
            stroke: myColor,
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
          // Start with empty text so no placeholder is ever visible while typing
          const text = new fabric.IText('', {
            left: pointer.x,
            top: pointer.y,
            fontFamily: 'Arial',
            fill: myColor,
            fontSize: 20,
          });
          text.id = crypto.randomUUID();
          canvas.add(text);
          canvas.setActiveObject(text);
          text.enterEditing();
          canvas.requestRenderAll();

          // Do not broadcast yet; wait until user confirms actual input
          pendingTextIdsRef.current.add(text.id);
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
    }, [activeTool, isFabricLoaded, currentUserId]);

    // Special listener for Text editing exit to trigger modification update
    useEffect(() => {
      if (!fabricCanvasRef.current || !isFabricLoaded) return;
      const canvas = fabricCanvasRef.current;

      const enteredHandler = (e: any) => {
        const target = e?.target;
        if (!target) return;
        // no-op for now; we start with empty text so no placeholder is visible
      };

      const exitedHandler = (e: any) => {
        const target = e?.target;
        if (!target) return;
        const id = target.id;

        // If this text was newly created, decide whether to broadcast or discard
        if (id && pendingTextIdsRef.current.has(id)) {
          pendingTextIdsRef.current.delete(id);

          if (isBlankText(target.text)) {
            // User didn't enter anything -> remove locally and do not broadcast
            canvas.remove(target);
            canvas.requestRenderAll();
            return;
          }

          // User entered valid text -> now broadcast as ADDED once
          onObjectAddedRef.current?.(target);
          return;
        }

        // Existing text edit -> broadcast as MODIFIED
        onObjectModifiedRef.current?.(target);
      };

      canvas.on('text:editing:entered', enteredHandler);
      canvas.on('text:editing:exited', exitedHandler);
      return () => {
        canvas.off('text:editing:entered', enteredHandler);
        canvas.off('text:editing:exited', exitedHandler);
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
