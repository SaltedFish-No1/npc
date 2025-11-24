import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

export type DraggablePosition = { x: number; y: number };

export type UseDraggableOptions = {
  storageKey?: string;
  defaultPosition?: DraggablePosition;
  boundsPadding?: number;
  surfaceSize?: { width: number; height: number };
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const getInitialPosition = (
  storageKey: string | undefined,
  fallback: DraggablePosition
): DraggablePosition => {
  if (typeof window === 'undefined') {
    return fallback;
  }
  if (storageKey) {
    try {
      const cached = window.localStorage.getItem(storageKey);
      if (cached) {
        const parsed = JSON.parse(cached) as DraggablePosition;
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          return parsed;
        }
      }
    } catch {
      /* ignore malformed cache */
    }
  }
  return fallback;
};

const clampToViewport = (
  position: DraggablePosition,
  boundsPadding: number,
  surfaceSize?: { width: number; height: number }
): DraggablePosition => {
  if (typeof window === 'undefined') {
    return position;
  }
  const width = surfaceSize?.width ?? 0;
  const height = surfaceSize?.height ?? 0;
  const maxX = Math.max(boundsPadding, window.innerWidth - boundsPadding - width);
  const maxY = Math.max(boundsPadding, window.innerHeight - boundsPadding - height);
  return {
    x: clamp(position.x, boundsPadding, maxX),
    y: clamp(position.y, boundsPadding, maxY)
  };
};

export const useDraggable = (options: UseDraggableOptions = {}) => {
  const {
    storageKey,
    defaultPosition = { x: 24, y: 24 },
    boundsPadding = 16,
    surfaceSize
  } = options;

  const [position, setPosition] = useState<DraggablePosition>(() =>
    clampToViewport(getInitialPosition(storageKey, defaultPosition), boundsPadding, surfaceSize)
  );
  const [isDragging, setIsDragging] = useState(false);
  const positionRef = useRef(position);
  positionRef.current = position;

  const clampPosition = useCallback(
    (input: DraggablePosition) => clampToViewport(input, boundsPadding, surfaceSize),
    [boundsPadding, surfaceSize]
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => {
      setPosition((prev) => clampPosition(prev));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [clampPosition]);

  useEffect(() => {
    if (!storageKey || typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(position));
    } catch {
      /* ignore quota errors */
    }
  }, [position, storageKey]);

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent): void => {
      const startPointer = { x: event.clientX, y: event.clientY };
      const startPosition = positionRef.current;
      let didDrag = false;

      const handlePointerMove = (moveEvent: PointerEvent) => {
        const deltaX = moveEvent.clientX - startPointer.x;
        const deltaY = moveEvent.clientY - startPointer.y;
        if (!didDrag) {
          const distance = Math.abs(deltaX) + Math.abs(deltaY);
          if (distance < 2) {
            return;
          }
          didDrag = true;
          setIsDragging(true);
        }
        const nextPosition = clampPosition({
          x: startPosition.x + deltaX,
          y: startPosition.y + deltaY
        });
        setPosition(nextPosition);
      };

      const handlePointerUp = () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
        if (didDrag) {
          setTimeout(() => setIsDragging(false), 0);
        }
      };

      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    },
    [clampPosition]
  );

  return {
    position,
    isDragging,
    handlePointerDown
  };
};
