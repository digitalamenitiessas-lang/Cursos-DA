'use client';

import { useEffect, useState } from 'react';
import DitherVeil from '@/components/react-bits/dither-veil';

export function StudioArtwork() {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let supported = false;
    try {
      const context = document.createElement('canvas').getContext('webgl2');
      supported = Boolean(context);
      context?.getExtension('WEBGL_lose_context')?.loseContext();
    } catch {
      /* The static artwork remains visible if WebGL is unavailable. */
    }
    const update = () => setEnabled(supported && !preference.matches);
    update();
    preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);
  return (
    <div className="studio-artwork" aria-hidden="true">
      <div className="studio-artwork-static" />
      {enabled && (
        <DitherVeil
          src="/brand/studio-art.svg"
          fit="cover"
          pattern="bayer"
          pixelSize={3}
          levels={4}
          inkColor="#14131d"
          paperColor="#c2afe5"
          revealRadius={95}
          rimColor="#bca3e9"
          rim={0.15}
          linger={0.45}
          clickBurst={true}
        />
      )}
      <span className="studio-artwork-caption">
        IDEAS EN MOVIMIENTO <span>DA / 01</span>
      </span>
    </div>
  );
}
