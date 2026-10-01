'use client';

import { useEffect, useRef } from 'react';

/** Decorative canvas: no captured inputs, tracking or dependencies. */
export function InteractiveField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let width = 0,
      height = 0,
      animation = 0,
      visible = true,
      lastFrame = 0;
    const pointer = { x: 0.68, y: 0.44, targetX: 0.68, targetY: 0.44 };
    function resize() {
      const rect = canvas!.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = width * ratio;
      canvas!.height = height * ratio;
      context!.setTransform(ratio, 0, 0, ratio, 0, 0);
      draw(0);
    }
    function draw(time: number) {
      if (!context || !width) return;
      const scroll = Math.min(window.scrollY / Math.max(height, 1), 1);
      pointer.x += (pointer.targetX - pointer.x) * 0.035;
      pointer.y += (pointer.targetY - pointer.y) * 0.035;
      context.clearRect(0, 0, width, height);
      const small = width < 760;
      const cx = width * (small ? 0.69 : 0.76) + (pointer.x - 0.5) * 60;
      const cy = height * (small ? 0.53 : 0.49) + (pointer.y - 0.5) * 50 - scroll * 65;
      const radius = Math.min(width * (small ? 0.58 : 0.3), 440);
      const phase = reduced.matches ? 0 : time * 0.00007;
      const glow = context.createRadialGradient(cx, cy, 0, cx, cy, radius * 1.45);
      glow.addColorStop(0, 'rgba(92,66,140,0.18)');
      glow.addColorStop(0.5, 'rgba(78,58,138,0.07)');
      glow.addColorStop(1, 'rgba(25,19,48,0)');
      context.fillStyle = glow;
      context.fillRect(0, 0, width, height);
      for (let ring = 0; ring < 38; ring++) {
        const r = radius * (0.25 + ring / 44);
        context.beginPath();
        for (let step = 0; step <= 144; step++) {
          const angle = (step / 144) * Math.PI * 2;
          const wave = Math.sin(angle * 3 + phase + ring * 0.095) * radius * 0.025;
          const rotation = -0.55 + scroll * 0.32 + (pointer.x - 0.5) * 0.1;
          const x = Math.cos(angle) * (r + wave);
          const y = Math.sin(angle) * (r * 0.7 + wave);
          const px = cx + x * Math.cos(rotation) - y * Math.sin(rotation);
          const py = cy + x * Math.sin(rotation) + y * Math.cos(rotation);
          if (!step) context.moveTo(px, py);
          else context.lineTo(px, py);
        }
        const alpha = 0.04 + Math.sin((ring / 38) * Math.PI) * 0.11;
        context.strokeStyle = `rgba(${ring > 28 ? '131,205,216' : '176,150,245'},${alpha})`;
        context.lineWidth = ring % 8 === 0 ? 1 : 0.6;
        context.stroke();
      }
      // A few lights travel on the field; no distracting particle swarm.
      for (let i = 0; i < 5; i++) {
        const angle = i * 1.28 + phase * 0.4;
        const r = radius * (0.65 + i * 0.085);
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r * 0.64;
        context.beginPath();
        context.arc(x, y, i === 1 ? 2.4 : 1.4, 0, Math.PI * 2);
        context.fillStyle = i === 1 ? '#b8a4ee' : '#808696';
        context.fill();
      }
    }
    function frame(time: number) {
      if (!visible || document.hidden || reduced.matches) {
        animation = 0;
        return;
      }
      if (time - lastFrame > 32) {
        draw(time);
        lastFrame = time;
      }
      animation = requestAnimationFrame(frame);
    }
    function start() {
      if (!animation && visible && !document.hidden && !reduced.matches)
        animation = requestAnimationFrame(frame);
    }
    function move(event: PointerEvent) {
      if (event.pointerType !== 'mouse') return;
      const rect = canvas!.getBoundingClientRect();
      pointer.targetX = event.clientX / Math.max(rect.width, 1);
      pointer.targetY = (event.clientY - rect.top) / Math.max(rect.height, 1);
      start();
    }
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      start();
    });
    const sizeObserver = new ResizeObserver(resize);
    observer.observe(canvas);
    sizeObserver.observe(canvas);
    const motionChange = () => {
      if (reduced.matches) {
        cancelAnimationFrame(animation);
        animation = 0;
        draw(0);
      } else start();
    };
    window.addEventListener('pointermove', move, { passive: true });
    document.addEventListener('visibilitychange', start);
    reduced.addEventListener('change', motionChange);
    resize();
    start();
    return () => {
      cancelAnimationFrame(animation);
      observer.disconnect();
      sizeObserver.disconnect();
      window.removeEventListener('pointermove', move);
      document.removeEventListener('visibilitychange', start);
      reduced.removeEventListener('change', motionChange);
    };
  }, []);
  return <canvas ref={canvasRef} className="interactive-field" aria-hidden="true" />;
}
