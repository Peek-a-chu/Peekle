'use client';

import React, { useEffect, useRef, useImperativeHandle, forwardRef, useState } from 'react';

export interface WhiteboardCanvasRef {
  add: (objData: any) => void;
  modify: (objData: any) => void;
  remove: (objectId: string) => void;
  clear: () => void;
}

interface WhiteboardCanvasProps {
  width?: number;
  height?: number;
  activeTool?: 'pen' | 'shape' | 'text' | 'eraser';
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

    // Helper to ensure ID
    const ensureId = (obj: any) => {
      if (!obj.id) {
        obj.id = crypto.randomUUID();
      }
      return obj.id;
    };

    useImperativeHandle(ref, () => ({
      add: (objData: any) => {
        if (!fabricCanvasRef.current || !fabricRef.current) return;
        const fabric = fabricRef.current;
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
    }));

    useEffect(() => {
      if (!canvasEl.current) return;

      let canvas: any;

      const initFabric = async () => {
        try {
          const mod = await import('fabric');
          fabricRef.current = mod.fabric;
          const fabric = mod.fabric;

          // Initialize fabric canvas
          canvas = new fabric.Canvas(canvasEl.current, {
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

          canvas.on('object:modified', (e: any) => {
            if (e.target) {
              onObjectModified?.(e.target);
            }
          });

          // Initial State
          canvas.isDrawingMode = activeTool === 'pen';

          setIsFabricLoaded(true);
        } catch (err) {
          console.error('Failed to load fabric', err);
        }
      };

      initFabric();

      // Cleanup
      return () => {
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

      // Reset canvas state
      canvas.isDrawingMode = false;
      canvas.selection = true;
      canvas.defaultCursor = 'default';
      canvas.hoverCursor = 'move';

      // Deselect all objects when switching tools
      canvas.discardActiveObject();

      let handler: ((opt: any) => void) | null = null;

      if (activeTool === 'pen') {
        canvas.isDrawingMode = true;
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
            if (targetId) onObjectRemoved?.(targetId);
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
          onObjectAdded?.(rect);
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
          onObjectAdded?.(text);
        };
      }

      if (handler) {
        canvas.on('mouse:down', handler);
        mouseDownHandlerRef.current = handler;
      }

      canvas.requestRenderAll();
    }, [activeTool, onObjectAdded, onObjectRemoved, isFabricLoaded]);

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
    }, [onObjectModified, isFabricLoaded]);

    return (
      <div className="relative border border-gray-200 shadow-sm">
        <canvas ref={canvasEl} />
      </div>
    );
  },
);

WhiteboardCanvas.displayName = 'WhiteboardCanvas';
