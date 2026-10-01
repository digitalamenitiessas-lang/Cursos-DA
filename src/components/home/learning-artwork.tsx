'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

const DitherVeil = dynamic(() => import('@/components/react-bits/dither-veil'), { ssr: false });

export function LearningArtwork() {
  const [interactive, setInteractive] = useState(false);
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let supported = false;
    try {
      const context = document.createElement('canvas').getContext('webgl2');
      supported = Boolean(context);
      context?.getExtension('WEBGL_lose_context')?.loseContext();
    } catch {
      // Keep the illustration visible on devices without WebGL.
    }
    const update = () => setInteractive(supported && !preference.matches);
    update();
    preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);

  return (
    <div className="learning-artwork" aria-hidden="true">
      <div className="learning-artwork-image" />
      {interactive && (
        <DitherVeil
          src="/brand/studio-art.svg"
          className="learning-artwork-veil"
          fit="cover"
          pattern="bayer"
          pixelSize={3}
          levels={5}
          inkColor="#0b0d12"
          paperColor="#bba6e4"
          revealRadius={105}
          linger={0.65}
          rimColor="#dec8ff"
          rim={0.12}
          clickBurst
        />
      )}
      <div className="learning-artwork-label">
        <span>IDEAS QUE TOMAN FORMA</span>
        <span>DA / 01</span>
      </div>
      <span className="learning-artwork-tag">Tu próxima posibilidad.</span>
    </div>
  );
}
