'use client';

import React, { useEffect, useRef, useImperativeHandle, forwardRef, useState } from 'react';

// Predefined colors for different users (excluding black which is for current user)
const USER_COLORS = [
  '#E53935', // Red
  '#1E88E5', // Blue
  '#43A047', // Green
  '#FB8C00', // Orange
  '#8E24AA', // Purple
  '#00ACC1', // Cyan
  '#F4511E', // Deep Orange
  '#3949AB', // Indigo
  '#7CB342', // Light Green
  '#C0CA33', // Lime
];

export interface WhiteboardCanvasRef {
  add: (objData: any, senderId?: string) => void;
  modify: (objData: any) => void;
  remove: (objectId: string) => void;
  clear: () => void;
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

    useImperativeHandle(ref, () => ({
      add: (objData: any, senderId?: string) => {
        if (!fabricCanvasRef.current || !fabricRef.current) return;
        const fabric = fabricRef.current;

        // Determine if this is from another user
        const isOtherUser = senderId && currentUserId && senderId !== currentUserId;
        const userColor = isOtherUser ? getUserColor(senderId) : null;

        // Deserialize and add
        // Note: fabric.util.enlivenObjects usually async
        fabric.util.enlivenObjects(
          [objData],
          (objects: any[]) => {
            objects.forEach((o) => {
              // Apply user color if from another user
              if (userColor) {
                if (o.type === 'path') {
                  o.set('stroke', userColor);
                } else if (o.type === 'rect') {
                  o.set('stroke', userColor);
                } else if (o.type === 'i-text' || o.type === 'text') {
                  o.set('fill', userColor);
                }
              }
              // Store senderId on the object for reference
              if (senderId) {
                o.senderId = senderId;
              }
              fabricCanvasRef.current?.add(o);
            });
            fabricCanvasRef.current?.requestRenderAll();
          },
          'fabric',
        );
      },
      modify: (objData: any) => {
        if (!fabricCanvasRef.current) return;
        const canvas = fabricCanvasRef.current;
        const obj = canvas.getObjects().find((o: any) => o.id === objData.id);
        if (obj) {
          obj.set(objData);
          obj.setCoords();
          canvas.requestRenderAll();
        }
      },
      remove: (objectId: string) => {
        if (!fabricCanvasRef.current) return;
        const canvas = fabricCanvasRef.current;

        const obj = canvas.getObjects().find((o: any) => o.id === objectId);
        if (obj) {
          canvas.remove(obj);
          canvas.requestRenderAll();
        }
      },
      clear: () => {
        fabricCanvasRef.current?.clear();
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
