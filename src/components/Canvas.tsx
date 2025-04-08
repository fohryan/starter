import React, { useRef, useState } from 'react';
import { usePlanStore } from '@/store/planStore';

const Canvas = () => {
  const items = usePlanStore((state) => state.items);
  const selectedIds = usePlanStore((state) => state.selectedItemIds);
  const selectItem = usePlanStore((state) => state.selectItem);
  const selectMultipleItems = usePlanStore((state) => state.selectMultipleItems);
  const clearSelection = usePlanStore((state) => state.clearSelection);
  const updateItemPosition = usePlanStore((state) => state.updateItemPosition);
  const updateItemRotation = usePlanStore((state) => state.updateItemRotation);

  const svgRef = useRef<SVGSVGElement>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const isDragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });
  const groupOffsets = useRef<Record<string, { dx: number; dy: number }>>({});
  const suppressClear = useRef(false);

  const [rotatingId, setRotatingId] = useState<string | null>(null);
  const [marqueeStart, setMarqueeStart] = useState<{ x: number; y: number } | null>(null);
  const [marqueeEnd, setMarqueeEnd] = useState<{ x: number; y: number } | null>(null);

  const getCursorPoint = (e: React.MouseEvent) => {
    const pt = svgRef.current?.createSVGPoint();
    if (!pt) return null;
    pt.x = e.clientX;
    pt.y = e.clientY;
    return pt.matrixTransform(svgRef.current.getScreenCTM()?.inverse());
  };

  const handleMouseDown = (
    e: React.MouseEvent,
    itemId?: string,
    itemX?: number,
    itemY?: number
  ) => {
    const cursor = getCursorPoint(e);
    if (!cursor) return;

    if (itemId && itemX !== undefined && itemY !== undefined) {
      console.log('[MouseDown] Shape click:', itemId);
      e.stopPropagation();
      suppressClear.current = true;

      if (selectedIds.includes(itemId)) {
        // Group drag
        groupOffsets.current = {};
        selectedIds.forEach((id) => {
          const item = items.find((i) => i.id === id);
          if (item) {
            groupOffsets.current[id] = {
              dx: cursor.x - item.x,
              dy: cursor.y - item.y,
            };
          }
        });
      } else {
        // Solo drag
        selectItem(itemId);
        offset.current = {
          x: cursor.x - itemX,
          y: cursor.y - itemY,
        };
      }

      setDragId(itemId);
      isDragging.current = true;
    } else {
      console.log('[MouseDown] Canvas click — initiating marquee');
      suppressClear.current = false;
      setMarqueeStart({ x: cursor.x, y: cursor.y });
      setMarqueeEnd({ x: cursor.x, y: cursor.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const cursor = getCursorPoint(e);
    if (!cursor) return;

    if (dragId) {
      if (groupOffsets.current[dragId]) {
        // Move all selected items
        selectedIds.forEach((id) => {
          const offset = groupOffsets.current[id];
          if (offset) {
            updateItemPosition(id, cursor.x - offset.dx, cursor.y - offset.dy);
          }
        });
      } else {
        // Solo drag fallback
        updateItemPosition(dragId, cursor.x - offset.current.x, cursor.y - offset.current.y);
      }
    }

    if (rotatingId) {
      const item = items.find((i) => i.id === rotatingId);
      if (item) {
        const dx = cursor.x - item.x;
        const dy = cursor.y - item.y;
        const angleRad = Math.atan2(dy, dx);
        const angleDeg = (angleRad * 180) / Math.PI + 90;
        updateItemRotation(rotatingId, angleDeg);
      }
    }

    if (marqueeStart) {
      setMarqueeEnd({ x: cursor.x, y: cursor.y });
    }
  };

  const handleMouseUp = () => {
    let didSuppress = false;

    if (marqueeStart && marqueeEnd) {
      const x1 = Math.min(marqueeStart.x, marqueeEnd.x);
      const y1 = Math.min(marqueeStart.y, marqueeEnd.y);
      const x2 = Math.max(marqueeStart.x, marqueeEnd.x);
      const y2 = Math.max(marqueeStart.y, marqueeEnd.y);

      console.log('[MouseUp] Marquee box:', { x1, y1, x2, y2 });

      const withinBox = items.filter((item) => {
        const size = 40;
        const half = size / 2;
        const ix1 = item.x - half;
        const iy1 = item.y - half;
        const ix2 = item.x + half;
        const iy2 = item.y + half;

        return !(ix2 < x1 || ix1 > x2 || iy2 < y1 || iy1 > y2);
      });

      if (withinBox.length > 0) {
        console.log(
          '[MouseUp] Marquee selected items:',
          withinBox.map((i) => i.id)
        );
        selectMultipleItems(withinBox.map((i) => i.id));
        suppressClear.current = true;
        didSuppress = true;
      } else {
        console.log('[MouseUp] Marquee selected nothing');
      }
    }

    if (rotatingId) {
      suppressClear.current = true;
      didSuppress = true;
    }

    setDragId(null);
    setRotatingId(null);
    setMarqueeStart(null);
    setMarqueeEnd(null);
    groupOffsets.current = {};
    isDragging.current = false;

    if (!didSuppress) {
      suppressClear.current = false;
    }
  };

  const handleCanvasClick = () => {
    if (!suppressClear.current) {
      console.log('[CanvasClick] Clearing selection');
      clearSelection();
    } else {
      console.log('[CanvasClick] Suppressed — not clearing');
    }
  };

  return (
    <div className="relative w-full h-full bg-neutral-100 flex items-center justify-center">
      <div className="aspect-[11/8.5] w-full max-w-6xl border border-black shadow-md bg-white">
        <svg
          ref={svgRef}
          className="w-full h-full"
          viewBox="0 0 1100 850"
          onClick={handleCanvasClick}
          onMouseDown={(e) => handleMouseDown(e)}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          <rect width="1100" height="850" fill="white" />
          <g>
            {items.map((item) => {
              const isSelected = selectedIds.includes(item.id);
              const size = 40;
              const half = size / 2;

              const corners = [
                { x: item.x - half, y: item.y - half },
                { x: item.x + half, y: item.y - half },
                { x: item.x - half, y: item.y + half },
                { x: item.x + half, y: item.y + half },
              ];

              return (
                <g key={item.id} transform={`rotate(${item.rotation}, ${item.x}, ${item.y})`}>
                  <rect
                    x={item.x - half}
                    y={item.y - half}
                    width={size}
                    height={size}
                    fill={item.type === 'mic' ? 'black' : 'gray'}
                    onMouseDown={(e) => handleMouseDown(e, item.id, item.x, item.y)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  {isSelected && (
                    <>
                      <rect
                        x={item.x - half - 4}
                        y={item.y - half - 4}
                        width={size + 8}
                        height={size + 8}
                        fill="none"
                        stroke="blue"
                        strokeDasharray="4 2"
                        strokeWidth={1.5}
                      />
                      {corners.map((corner, index) => (
                        <g key={index}>
                          <circle
                            cx={corner.x}
                            cy={corner.y}
                            r={12}
                            fill="transparent"
                            pointerEvents="all"
                            cursor="grab"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              suppressClear.current = true;
                              setRotatingId(item.id);
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <circle
                            cx={corner.x}
                            cy={corner.y}
                            r={5}
                            fill="white"
                            stroke="blue"
                            strokeWidth={1.5}
                            cursor="grab"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              suppressClear.current = true;
                              setRotatingId(item.id);
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </g>
                      ))}
                    </>
                  )}
                </g>
              );
            })}
          </g>

          {marqueeStart && marqueeEnd && (
            <rect
              x={Math.min(marqueeStart.x, marqueeEnd.x)}
              y={Math.min(marqueeStart.y, marqueeEnd.y)}
              width={Math.abs(marqueeEnd.x - marqueeStart.x)}
              height={Math.abs(marqueeEnd.y - marqueeStart.y)}
              fill="rgba(0, 120, 255, 0.1)"
              stroke="blue"
              strokeDasharray="4 2"
              strokeWidth={1}
            />
          )}
        </svg>
      </div>
    </div>
  );
};

export default Canvas;
