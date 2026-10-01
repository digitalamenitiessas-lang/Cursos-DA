'use client';

// Adapted from React Bits by David Haz. See LICENSE.md in this directory.
import { useRef } from 'react';
import type { PropsWithChildren, PointerEvent } from 'react';

export function SpotlightCard({
  children,
  className = '',
}: PropsWithChildren<{ className?: string }>) {
  const ref = useRef<HTMLDivElement>(null);
  function move(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === 'touch' || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    ref.current.style.setProperty('--mouse-x', `${event.clientX - rect.left}px`);
    ref.current.style.setProperty('--mouse-y', `${event.clientY - rect.top}px`);
  }
  return (
    <div ref={ref} onPointerMove={move} className={`studio-spotlight ${className}`}>
      {children}
    </div>
  );
}
