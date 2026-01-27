'use client';

import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { fabric } from 'fabric';

export interface WhiteboardCanvasRef {
  add: (objData: any) => void;
  modify: (objData: any) => void;
  remove: (objectId: string) => void;
  clear: () => void;
  updateCursor: (senderId: string | number, x: number, y: number, name?: string) => void;
  removeCursor: (senderId: string | number) => void;
}

interface WhiteboardCanvasProps {
  width?: number;
  height?: number;
  activeTool?: 'pen' | 'shape' | 'text' | 'eraser';
  onObjectAdded?: (obj: any) => void;
  onObjectModified?: (obj: any) => void;
  onObjectRemoved?: (objectId: string) => void;
  onCursorMove?: (x: number, y: number) => void;
}

export const WhiteboardCanvas = forwardRef<WhiteboardCanvasRef, WhiteboardCanvasProps>(
  (
    {
      width = 800,
      height = 600,
      activeTool = 'pen',
      onObjectAdded,
      onObjectModified,
      onObjectRemoved,
      onCursorMove,
    },
    ref,
  ) => {
    const canvasEl = useRef<HTMLCanvasElement>(null);
    const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
    const cursorsRef = useRef<Map<string | number, fabric.Object>>(new Map());

    // Helper to ensure ID
    const ensureId = (obj: any) => {
      if (!obj.id) {
        obj.id = crypto.randomUUID();
      }
      return obj.id;
    };

    useImperativeHandle(ref, () => ({
      add: (objData: any) => {
        if (!fabricCanvasRef.current) return;
        // Deserialize and add
        // Note: fabric.util.enlivenObjects usually async
        fabric.util.enlivenObjects(
          [objData],
          (objects: any[]) => {
            objects.forEach((o) => {
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
      updateCursor: (senderId: string | number, x: number, y: number, name?: string) => {
        if (!fabricCanvasRef.current) return;
        const canvas = fabricCanvasRef.current;
        let cursor = cursorsRef.current.get(senderId);

        if (!cursor) {
          // Create new cursor
          const color = '#' + Math.floor(Math.random() * 16777215).toString(16); // Random color for now
          cursor = new fabric.Circle({
            left: x,
            top: y,
            radius: 5,
            fill: color,
            originX: 'center',
            originY: 'center',
            selectable: false,
            evented: false,
            excludeFromExport: true, // Don't save this in JSON
          });
          // Optionally add a label
          if (name) {
            // Fabric group logic would be better for complex cursors, but Circle is simple
          }

          canvas.add(cursor);
          cursorsRef.current.set(senderId, cursor);
        } else {
          cursor.set({ left: x, top: y });
          cursor.setCoords();
        }
        canvas.requestRenderAll();
      },
      removeCursor: (senderId: string | number) => {
        if (!fabricCanvasRef.current) return;
        const cursor = cursorsRef.current.get(senderId);
        if (cursor) {
          fabricCanvasRef.current.remove(cursor);
          cursorsRef.current.delete(senderId);
          fabricCanvasRef.current.requestRenderAll();
        }
      },
    }));

    useEffect(() => {
      if (!canvasEl.current) return;

      // Initialize fabric canvas
      const canvas = new fabric.Canvas(canvasEl.current, {
        width,
        height,
        backgroundColor: '#ffffff',
      });

      fabricCanvasRef.current = canvas;

      // Core Event Listeners
      canvas.on('path:created', (e: any) => {
        if (e.path) {
          ensureId(e.path);
          onObjectAdded?.(e.path);
        }
      });

      canvas.on('object:modified', (e) => {
        if (e.target) {
          onObjectModified?.(e.target);
        }
      });

      canvas.on('mouse:move', (e) => {
        if (onCursorMove) {
          const pointer = canvas.getPointer(e.e);
          onCursorMove(pointer.x, pointer.y);
        }
      });

      // Initial State
      canvas.isDrawingMode = activeTool === 'pen';

      // Cleanup
      return () => {
        canvas.dispose();
        fabricCanvasRef.current = null;
      };
    }, [width, height]);

    // Updates when tool changes
    const mouseDownHandlerRef = useRef<((opt: fabric.IEvent) => void) | null>(null);

    useEffect(() => {
      if (!fabricCanvasRef.current) return;
      const canvas = fabricCanvasRef.current;

      canvas.isDrawingMode = activeTool === 'pen';

      // Cleanup previous event listener
      if (mouseDownHandlerRef.current) {
        canvas.off('mouse:down', mouseDownHandlerRef.current);
        mouseDownHandlerRef.current = null;
      }

      // Set cursor defaults
      canvas.defaultCursor = 'default';
      canvas.hoverCursor = 'move';

      let handler: ((opt: fabric.IEvent) => void) | null = null;

      if (activeTool === 'eraser') {
        canvas.defaultCursor = 'cell';
        canvas.hoverCursor = 'cell';
        canvas.isDrawingMode = false;
        canvas.selection = false;

        handler = (opt) => {
          if (opt.target) {
            const targetId = (opt.target as any).id;
            canvas.remove(opt.target);
            canvas.requestRenderAll();
            if (targetId) onObjectRemoved?.(targetId);
          }
        };
      } else if (activeTool === 'shape') {
        canvas.selection = false;
        handler = (opt) => {
          if (opt.target) return;
          const pointer = canvas.getPointer(opt.e);
          const rect = new fabric.Rect({
            left: pointer.x,
            top: pointer.y,
            fill: 'transparent',
            stroke: 'black',
            strokeWidth: 2,
            width: 100,
            height: 100,
          });
          (rect as any).id = crypto.randomUUID();
          canvas.add(rect);
          canvas.setActiveObject(rect);
          onObjectAdded?.(rect);
        };
      } else if (activeTool === 'text') {
        canvas.selection = false;
        handler = (opt) => {
          if (opt.target) return;
          const pointer = canvas.getPointer(opt.e);
          const text = new fabric.IText('Type here', {
            left: pointer.x,
            top: pointer.y,
            fontFamily: 'Arial',
            fill: '#333333',
            fontSize: 20,
          });
          (text as any).id = crypto.randomUUID();
          canvas.add(text);
          canvas.setActiveObject(text);
          text.enterEditing();
          onObjectAdded?.(text); // Might need to fire on editing exit? Per spec.
          // Spec says: text:editing:exited for ADDED or MODIFIED.
          // But for consistency let's fire ADDED now.
        };

        // We should listen to text:editing:exited separately if we want to capture the content change.
        // But 'object:modified' handles geometry changes. Content change is specific to text.
        // Let's add that listener globally or here.
        // For global consistency, let's just rely on object:modified (which fires on scale/rotate)
        // AND 'text:changed' or 'text:editing:exited'.
      } else {
        // Pen or Default
        canvas.selection = true;
      }

      if (handler) {
        canvas.on('mouse:down', handler);
        mouseDownHandlerRef.current = handler;
      }

      canvas.requestRenderAll();
    }, [activeTool, onObjectAdded, onObjectRemoved]);

    // Special listener for Text editing exit to trigger modification update
    useEffect(() => {
      if (!fabricCanvasRef.current) return;
      const canvas = fabricCanvasRef.current;

      const textHandler = (e: any) => {
        onObjectModified?.(e.target);
      };

      canvas.on('text:editing:exited', textHandler);
      return () => {
        canvas.off('text:editing:exited', textHandler);
      };
    }, [onObjectModified]);

    return (
      <div className="relative border border-gray-200 shadow-sm">
        <canvas ref={canvasEl} />
      </div>
    );
  },
);

WhiteboardCanvas.displayName = 'WhiteboardCanvas';
