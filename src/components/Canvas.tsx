import React, { useEffect, useRef, useState } from 'react';
import { shallow } from 'zustand/shallow';
import { usePlanStore } from '@/store/planStore';
import { v4 as uuid } from 'uuid';

const Canvas = () => {
  const items = usePlanStore((state) => state.items);
  const selectedIds = usePlanStore((state) => state.selectedItemIds, shallow);
  const selectItem = usePlanStore((state) => state.selectItem);
  const toggleItemSelection = usePlanStore((state) => state.toggleItemSelection);
  const selectMultipleItems = usePlanStore((state) => state.selectMultipleItems);
  const clearSelection = usePlanStore((state) => state.clearSelection);
  const updateItemPosition = usePlanStore((state) => state.updateItemPosition);
  const updateItemRotation = usePlanStore((state) => state.updateItemRotation);
  const removeItems = usePlanStore((state) => state.removeItems);
  const addItem = usePlanStore((state) => state.addItem);

  const svgRef = useRef<SVGSVGElement>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const isDragging = useRef(false);
  const didDrag = useRef(false);
  const offset = useRef({ x: 0, y: 0 });
  const originalPosition = useRef<{ x: number; y: number } | null>(null);
  const groupOffsets = useRef<Record<string, { dx: number; dy: number }>>({});
  const suppressClear = useRef(false);
  const isAltCloning = useRef(false);
  const clonePreview = useRef<{
    id: string;
    type: string;
    x: number;
    y: number;
    rotation: number;
  } | null>(null);

  const [cloneGhostState, setCloneGhostState] = useState<typeof clonePreview.current>(null);
  const [rotatingId, setRotatingId] = useState<string | null>(null);
  const [marqueeStart, setMarqueeStart] = useState<{ x: number; y: number } | null>(null);
  const [marqueeEnd, setMarqueeEnd] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.length > 0) {
        e.preventDefault();
        removeItems(selectedIds);
      }
      if (e.altKey && dragId && !isAltCloning.current && isDragging.current) {
        const original = items.find((i) => i.id === dragId);
        if (original) {
          isAltCloning.current = true;
          clonePreview.current = {
            ...original,
            id: uuid(),
            x: original.x,
            y: original.y,
            rotation: original.rotation,
          };
          setCloneGhostState({ ...clonePreview.current });
          if (originalPosition.current) {
            updateItemPosition(dragId, originalPosition.current.x, originalPosition.current.y);
          }
        }
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (!e.altKey && isAltCloning.current) {
        isAltCloning.current = false;
        clonePreview.current = null;
        setCloneGhostState(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [selectedIds, removeItems, dragId, items, updateItemPosition]);

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

    didDrag.current = false;

    if (itemId && itemX !== undefined && itemY !== undefined) {
      e.stopPropagation();
      suppressClear.current = true;

      if (e.shiftKey) {
        toggleItemSelection(itemId);
      } else if (!selectedIds.includes(itemId)) {
        selectItem(itemId);
      }

      if (selectedIds.includes(itemId)) {
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
      }

      offset.current = {
        x: cursor.x - itemX,
        y: cursor.y - itemY,
      };

      const original = items.find((i) => i.id === itemId);
      if (original) {
        originalPosition.current = { x: original.x, y: original.y };
      }

      if (e.altKey && original) {
        isAltCloning.current = true;
        clonePreview.current = {
          ...original,
          id: uuid(),
          x: original.x,
          y: original.y,
          rotation: original.rotation,
        };
        setCloneGhostState({ ...clonePreview.current });
      } else {
        isAltCloning.current = false;
        clonePreview.current = null;
        setCloneGhostState(null);
      }

      setDragId(itemId);
      isDragging.current = true;
    } else {
      suppressClear.current = true;
      setMarqueeStart({ x: cursor.x, y: cursor.y });
      setMarqueeEnd({ x: cursor.x, y: cursor.y });
      console.log('[Marquee] Start at', cursor.x, cursor.y);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const cursor = getCursorPoint(e);
    if (!cursor) return;

    if (dragId) {
      didDrag.current = true;

      if (isAltCloning.current && clonePreview.current) {
        const offsetData = groupOffsets.current[dragId] ?? offset.current;
        const dx = offsetData?.dx ?? offsetData?.x ?? 0;
        const dy = offsetData?.dy ?? offsetData?.y ?? 0;

        clonePreview.current.x = cursor.x - dx;
        clonePreview.current.y = cursor.y - dy;

        setCloneGhostState({ ...clonePreview.current });
        console.log(
          '[CloneGhost] Position updated to:',
          clonePreview.current.x,
          clonePreview.current.y
        );
      } else if (groupOffsets.current[dragId]) {
        selectedIds.forEach((id) => {
          const offset = groupOffsets.current[id];
          if (offset) {
            updateItemPosition(id, cursor.x - offset.dx, cursor.y - offset.dy);
          }
        });
      } else {
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

  const applyMarqueeSelection = (e: React.MouseEvent) => {
    if (!marqueeStart || !marqueeEnd) return;

    console.log('[Marquee] End at', marqueeEnd.x, marqueeEnd.y);
    const x1 = Math.min(marqueeStart.x, marqueeEnd.x);
    const y1 = Math.min(marqueeStart.y, marqueeEnd.y);
    const x2 = Math.max(marqueeStart.x, marqueeEnd.x);
    const y2 = Math.max(marqueeStart.y, marqueeEnd.y);

    const size = 40;
    const half = size / 2;

    const idsInBox = items
      .filter((item) => {
        const left = item.x - half;
        const right = item.x + half;
        const top = item.y - half;
        const bottom = item.y + half;

        const intersects = right >= x1 && left <= x2 && bottom >= y1 && top <= y2;

        if (intersects) {
          console.log(
            `[Marquee] ✓ Including item ${item.id} with bounds [${left}, ${top}] to [${right}, ${bottom}]`
          );
        } else {
          console.log(
            `[Marquee] ✗ Skipping item ${item.id} with bounds [${left}, ${top}] to [${right}, ${bottom}]`
          );
        }

        return intersects;
      })
      .map((item) => item.id);

    console.log('[Marquee] Items found:', idsInBox);

    if (e.shiftKey) {
      idsInBox.forEach(toggleItemSelection);
    } else {
      selectMultipleItems(idsInBox);
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (isAltCloning.current && clonePreview.current) {
      const { type, x, y, rotation } = clonePreview.current;
      addItem(type as any, x, y, rotation); // ✅ Includes rotation now
    }

    applyMarqueeSelection(e);

    isAltCloning.current = false;
    clonePreview.current = null;
    setCloneGhostState(null);
    originalPosition.current = null;

    setDragId(null);
    setRotatingId(null);
    setMarqueeStart(null);
    setMarqueeEnd(null);
    groupOffsets.current = {};
    isDragging.current = false;
    didDrag.current = false;
  };

  const handleCanvasClick = () => {
    if (!suppressClear.current) {
      clearSelection();
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
              console.log(`[Render] Item ${item.id} is ${isSelected ? 'ACTIVE' : 'inactive'}`);
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
                    width={40}
                    height={40}
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

            {cloneGhostState && (
              <g
                transform={`translate(${cloneGhostState.x}, ${cloneGhostState.y}) rotate(${cloneGhostState.rotation})`}
                opacity={0.7}
              >
                <rect
                  x={-20}
                  y={-20}
                  width={40}
                  height={40}
                  fill={cloneGhostState.type === 'mic' ? 'black' : 'gray'}
                />
              </g>
            )}
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
