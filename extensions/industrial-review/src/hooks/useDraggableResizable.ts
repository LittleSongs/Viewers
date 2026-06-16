import { useCallback, useMemo, useRef, useState } from 'react';

interface Size {
  width: number;
  height: number;
}

interface Position {
  x: number;
  y: number;
}

interface UseDraggableResizableOptions {
  initialPosition: Position;
  initialSize: Size;
  minSize: Size;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export default function useDraggableResizable({
  initialPosition,
  initialSize,
  minSize,
}: UseDraggableResizableOptions) {
  const [position, setPosition] = useState(initialPosition);
  const [size, setSize] = useState(initialSize);
  const dragState = useRef<{
    startX: number;
    startY: number;
    initialPosition: Position;
  } | null>(null);
  const resizeState = useRef<{
    startX: number;
    startY: number;
    initialSize: Size;
  } | null>(null);

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      if (dragState.current) {
        const nextX =
          dragState.current.initialPosition.x + event.clientX - dragState.current.startX;
        const nextY =
          dragState.current.initialPosition.y + event.clientY - dragState.current.startY;
        const maxX = window.innerWidth - minSize.width;
        const maxY = window.innerHeight - 48;

        setPosition({
          x: clamp(nextX, 8, Math.max(8, maxX)),
          y: clamp(nextY, 8, Math.max(8, maxY)),
        });
        return;
      }

      if (resizeState.current) {
        const nextWidth =
          resizeState.current.initialSize.width + event.clientX - resizeState.current.startX;
        const nextHeight =
          resizeState.current.initialSize.height + event.clientY - resizeState.current.startY;

        setSize({
          width: clamp(nextWidth, minSize.width, Math.max(minSize.width, window.innerWidth - 16)),
          height: clamp(
            nextHeight,
            minSize.height,
            Math.max(minSize.height, window.innerHeight - 16)
          ),
        });
      }
    },
    [minSize.height, minSize.width]
  );

  const stopPointerAction = useCallback(() => {
    dragState.current = null;
    resizeState.current = null;
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', stopPointerAction);
  }, [handlePointerMove]);

  const startDrag = useCallback(
    (event: React.PointerEvent) => {
      event.preventDefault();
      dragState.current = {
        startX: event.clientX,
        startY: event.clientY,
        initialPosition: position,
      };
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', stopPointerAction);
    },
    [handlePointerMove, position, stopPointerAction]
  );

  const startResize = useCallback(
    (event: React.PointerEvent) => {
      event.preventDefault();
      event.stopPropagation();
      resizeState.current = {
        startX: event.clientX,
        startY: event.clientY,
        initialSize: size,
      };
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', stopPointerAction);
    },
    [handlePointerMove, size, stopPointerAction]
  );

  const style = useMemo(
    () => ({
      left: position.x,
      top: position.y,
      width: size.width,
      height: size.height,
    }),
    [position.x, position.y, size.height, size.width]
  );

  return {
    position,
    size,
    style,
    startDrag,
    startResize,
  };
}
