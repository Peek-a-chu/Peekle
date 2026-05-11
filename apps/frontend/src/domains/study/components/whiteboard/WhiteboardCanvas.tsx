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
import type { Canvas as FabricCanvas } from 'fabric';

type WhiteboardTool = 'select' | 'pen' | 'shape' | 'text' | 'eraser' | (string & {});

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
  activeTool?: WhiteboardTool;
  currentUserId?: string | number;
  onObjectAdded?: (obj: any) => void;
  onObjectModified?: (obj: any) => void;
  onObjectRemoved?: (objectId: string) => void;
  onReady?: () => void;
}

type FabricModuleCompat = typeof import('fabric') & {
  fabric?: typeof import('fabric');
  default?: typeof import('fabric');
};

const resolveFabricModule = (module: typeof import('fabric')): typeof import('fabric') => {
  const compatModule = module as FabricModuleCompat;
  return compatModule.fabric ?? compatModule.default ?? module;
};

const WHITEBOARD_REMOTE_BATCH_MS = 16;

declare global {
  interface Window {
    fabric?: typeof import('fabric');
    fabricCanvas?: FabricCanvas;
  }
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
    const pendingServerMessagesRef = useRef<WhiteboardMessage[]>([]);
    const pendingServerFlushTimerRef = useRef<number | null>(null);
    const isFlushingServerMessagesRef = useRef(false);
    const objectIndexRef = useRef<Map<string, any>>(new Map());
    const syncGenerationRef = useRef(0);

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

    const registerObject = useCallback((obj: any) => {
      if (obj?.id) {
        objectIndexRef.current.set(String(obj.id), obj);
      }
    }, []);

    const findObjectById = useCallback(
      (canvas: any, objectId: string | undefined) => {
        if (!objectId) return undefined;

        const normalizedObjectId = String(objectId);
        const cached = objectIndexRef.current.get(normalizedObjectId);
        if (cached) {
          if (cached.canvas === canvas || cached.group?.canvas === canvas) {
            return cached;
          }
          objectIndexRef.current.delete(normalizedObjectId);
        }

        const found = canvas.getObjects().find((obj: any) => String(obj.id) === normalizedObjectId);
        if (found) {
          registerObject(found);
        } else {
          objectIndexRef.current.delete(normalizedObjectId);
        }

        return found;
      },
      [registerObject],
    );

    const removeObject = useCallback((canvas: any, obj: any) => {
      const objectId = obj?.id ? String(obj.id) : null;
      canvas.remove(obj);
      if (objectId) {
        objectIndexRef.current.delete(objectId);
      }
    }, []);

    const enlivenObjects = useCallback(
      (fabric: any, objectsData: any[], onObjects: (objects: any[]) => void) =>
        new Promise<void>((resolve) => {
          let settled = false;

          const finish = (objects: any[]) => {
            if (settled) return;
            settled = true;
            onObjects(objects);
            resolve();
          };

          const enlivener = fabric.util.enlivenObjects(objectsData, finish);
          if (enlivener && typeof enlivener.then === 'function') {
            enlivener.then(finish).catch((error: unknown) => {
              console.error('Failed to enliven whiteboard objects', error);
              resolve();
            });
          }
        }),
      [],
    );

    // 내부 액션 처리 함수 (재사용을 위해 분리)
    const handleAction = useCallback(
      async (
        action: string,
        objectId: string | undefined,
        data: any,
        senderId: string | undefined,
      ) => {
        if (!fabricCanvasRef.current || !fabricRef.current) return;
        const canvas = fabricCanvasRef.current;
        const fabric = fabricRef.current;

        switch (action) {
          case 'ADDED':
            if (data) {
              const normalizedSenderId =
                senderId !== undefined && senderId !== null ? String(senderId) : null;
              const normalizedCurrentUserId =
                currentUserId !== undefined && currentUserId !== null
                  ? String(currentUserId)
                  : null;

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
                  const exists = findObjectById(canvas, o.id);
                  if (!exists) {
                    canvas.add(o);
                    registerObject(o);
                  }
                });
                canvas.requestRenderAll();
              };

              // Handle both Callback (v5) and Promise (v6)
              await enlivenObjects(fabric, [objectData], addObjectsToCanvas);
            }
            break;
          case 'MODIFIED':
            if (objectId) {
              const obj = findObjectById(canvas, objectId);
              if (obj) {
                obj.set(data);
                obj.setCoords();
                registerObject(obj);
                canvas.requestRenderAll();
              }
            }
            break;
          case 'REMOVED':
            if (objectId) {
              const obj = findObjectById(canvas, objectId);
              if (obj) {
                removeObject(canvas, obj);
                canvas.requestRenderAll();
              }
            }
            break;
          case 'CLEAR':
            // [Fix] Use manual cleanup instead of canvas.clear() to avoid 'fire' undefined error
            canvas.discardActiveObject();
            canvas
              .getObjects()
              .slice()
              .forEach((obj: any) => {
                removeObject(canvas, obj);
              });
            objectIndexRef.current.clear();
            canvas.backgroundImage = null;
            canvas.overlayImage = null;
            canvas.setBackgroundColor('#ffffff', () => canvas.renderAll());
            break;
        }
      },
      [currentUserId, enlivenObjects, findObjectById, registerObject, removeObject],
    );

    const processMessage = useCallback(
      async (message: WhiteboardMessage) => {
        const { action, objectId, data, senderId } = message;
        if (action === 'SYNC') {
          const syncGeneration = syncGenerationRef.current + 1;
          syncGenerationRef.current = syncGeneration;

          // 초기 동기화: history 배열 처리
          if (data && Array.isArray(data.history)) {
            await handleAction('CLEAR', undefined, undefined, undefined);
            if (syncGeneration !== syncGenerationRef.current) return;

            const history = data.history as WhiteboardMessage[];

            // [Fix] Handle history with CLEAR events: only process events after the last CLEAR
            const lastClearIndex = history.map((h) => h.action).lastIndexOf('CLEAR');
            const effectiveHistory =
              lastClearIndex !== -1 ? history.slice(lastClearIndex + 1) : history;

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
                if (syncGeneration !== syncGenerationRef.current) return;
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
                    currentUserId !== undefined && currentUserId !== null
                      ? String(currentUserId)
                      : null;
                  const isSelf =
                    normalizedSenderId &&
                    normalizedCurrentUserId &&
                    normalizedSenderId === normalizedCurrentUserId;
                  const userColor =
                    normalizedSenderId && !isSelf ? getUserColor(normalizedSenderId) : null;

                  applyUserColorToObject(o, userColor);
                  o.setCoords();

                  // [Fix] Prevent duplicates
                  const exists = findObjectById(canvas, o.id);
                  if (!exists) {
                    canvas.add(o);
                    registerObject(o);
                  }
                });

                canvas.requestRenderAll();
              };

              // Handle both Callback (v5) and Promise (v6)
              await enlivenObjects(fabricRef.current, fabricDataList, addHistoryToCanvas);
              if (syncGeneration !== syncGenerationRef.current) return;

              for (const msg of otherEvents) {
                await handleAction(msg.action, msg.objectId, msg.data, msg.senderId?.toString());
              }
            } else {
              // 추가된 객체가 없으면 나머지 이벤트만 처리
              for (const msg of otherEvents) {
                await handleAction(msg.action, msg.objectId, msg.data, msg.senderId?.toString());
              }
            }
          } else if (data && (Array.isArray(data) || Array.isArray(data.objects))) {
            // [New] Handle direct object list (Snapshot) for full sync
            await handleAction('CLEAR', undefined, undefined, undefined);
            if (syncGeneration !== syncGenerationRef.current) return;
            const rawObjects = Array.isArray(data) ? data : data.objects;
            const objectsData = JSON.parse(JSON.stringify(rawObjects));

            if (fabricRef.current && objectsData.length > 0) {
              const addObjectsToCanvas = (objects: any[]) => {
                const canvas = fabricCanvasRef.current;
                if (syncGeneration !== syncGenerationRef.current) return;
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
                    currentUserId !== undefined && currentUserId !== null
                      ? String(currentUserId)
                      : null;
                  const isSelf =
                    normalizedSenderId &&
                    normalizedCurrentUserId &&
                    normalizedSenderId === normalizedCurrentUserId;
                  const userColor =
                    normalizedSenderId && !isSelf ? getUserColor(normalizedSenderId) : null;

                  applyUserColorToObject(o, userColor);

                  o.setCoords();
                  canvas.add(o);
                  registerObject(o);
                });
                canvas.requestRenderAll();
              };

              await enlivenObjects(fabricRef.current, objectsData, addObjectsToCanvas);
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
          await handleAction(action, objectId, data, senderId?.toString());
        }
      },
      [currentUserId, enlivenObjects, handleAction],
    );

    const flushPendingServerMessages = useCallback(async () => {
      pendingServerFlushTimerRef.current = null;
      if (isFlushingServerMessagesRef.current) return;

      isFlushingServerMessagesRef.current = true;
      try {
        while (pendingServerMessagesRef.current.length > 0) {
          const pendingMessages = pendingServerMessagesRef.current.splice(0);
          for (const message of pendingMessages) {
            await processMessage(message);
          }
        }
      } finally {
        isFlushingServerMessagesRef.current = false;
      }
    }, [processMessage]);

    const enqueueServerMessage = useCallback(
      (message: WhiteboardMessage) => {
        pendingServerMessagesRef.current.push(message);

        if (pendingServerFlushTimerRef.current || isFlushingServerMessagesRef.current) {
          return;
        }

        pendingServerFlushTimerRef.current = window.setTimeout(
          flushPendingServerMessages,
          WHITEBOARD_REMOTE_BATCH_MS,
        );
      },
      [flushPendingServerMessages],
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
        enqueueServerMessage(message);
      },
      isReady: () => isFabricLoaded && !!fabricCanvasRef.current,
    }));

    useEffect(() => {
      return () => {
        if (pendingServerFlushTimerRef.current) {
          window.clearTimeout(pendingServerFlushTimerRef.current);
          pendingServerFlushTimerRef.current = null;
        }
        pendingServerMessagesRef.current = [];
        isFlushingServerMessagesRef.current = false;
        objectIndexRef.current.clear();
      };
    }, []);

    useEffect(() => {
      if (!canvasEl.current) return;

      let canvas: FabricCanvas | null = null;
      let isMounted = true;

      const initFabric = async () => {
        try {
          console.log('[WhiteboardCanvas] Starting fabric init...');
          const mod = await import('fabric');
          console.log('[WhiteboardCanvas] Fabric module loaded');

          // fabric v5 compatibility: handle different export styles
          const fabric = resolveFabricModule(mod);

          if (!isMounted) return;

          fabricRef.current = fabric;

          // [Fix] Ensure fabric is available globally for enlivenObjects to work correctly
          if (typeof window !== 'undefined') {
            window.fabric = fabric;
            console.log('[WhiteboardCanvas] Exposing fabricCanvas to window');
          }

          // Initialize fabric canvas
          const canvasElement = canvasEl.current;
          if (!canvasElement) return;

          canvas = new fabric.Canvas(canvasElement, {
            width,
            height,
            backgroundColor: '#ffffff',
          });

          if (typeof window !== 'undefined') {
            window.fabricCanvas = canvas;
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
              registerObject(e.path);
              onObjectAddedRef.current?.(e.path);
            }
          });

          canvas.on('object:modified', (e: any) => {
            if (e.target) {
              registerObject(e.target);
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
        messageQueueRef.current.forEach((msg) => enqueueServerMessage(msg));
        messageQueueRef.current = [];
      }
    }, [isFabricLoaded, enqueueServerMessage]);

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
      const myColor = currentUserId ? getUserColor(String(currentUserId)) : '#000000';

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
            removeObject(canvas, opt.target);
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
          registerObject(rect);
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
          registerObject(text);
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
    }, [activeTool, isFabricLoaded, currentUserId, registerObject, removeObject]);

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
            removeObject(canvas, target);
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
    }, [isFabricLoaded, removeObject]);

    return (
      <div className="relative border border-gray-200 shadow-sm">
        <canvas ref={canvasEl} />
      </div>
    );
  },
);

WhiteboardCanvas.displayName = 'WhiteboardCanvas';
