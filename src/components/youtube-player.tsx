'use client';

import { useEffect, useRef, useState } from 'react';

import { loadYouTubeApi, type YouTubePlayerApi } from '@/lib/media/youtube-player-api';

export function YouTubePlayer({
  videoId,
  startTime,
  onTimeUpdate,
  onPause,
  onEnded,
}: {
  videoId: string;
  startTime: number;
  onTimeUpdate: (seconds: number) => void;
  onPause: () => void;
  onEnded: () => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const callbacks = useRef({ onTimeUpdate, onPause, onEnded });
  callbacks.current = { onTimeUpdate, onPause, onEnded };
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    let player: YouTubePlayerApi | undefined;
    let playerReady = false;
    let timer: ReturnType<typeof setInterval> | undefined;
    setError('');
    const capture = (target: YouTubePlayerApi) => {
      const seconds = target.getCurrentTime();
      if (Number.isFinite(seconds) && seconds >= 0) callbacks.current.onTimeUpdate(seconds);
    };
    loadYouTubeApi()
      .then((api) => {
        if (!active || !hostRef.current) return;
        const target = document.createElement('div');
        hostRef.current.replaceChildren(target);
        player = new api.Player(target, {
          host: 'https://www.youtube-nocookie.com',
          videoId,
          width: '100%',
          height: '100%',
          playerVars: {
            origin: window.location.origin,
            start: Math.max(0, Math.floor(startTime)),
            playsinline: 1,
            rel: 0,
          },
          events: {
            onReady: ({ target }) => {
              if (!active) return;
              playerReady = true;
              const iframe = hostRef.current?.querySelector('iframe');
              if (iframe) iframe.title = 'Video de la clase en YouTube';
              timer = setInterval(() => {
                if (target.getPlayerState() === 1) capture(target);
              }, 1000);
            },
            onStateChange: ({ target, data }) => {
              if (!active || (data !== 0 && data !== 2)) return;
              capture(target);
              if (data === 0) callbacks.current.onEnded();
              else callbacks.current.onPause();
            },
            onError: ({ data }) => {
              if (!active) return;
              setError(
                data === 100 || data === 101 || data === 150
                  ? 'YouTube no permite reproducir este video. Revisá que sea oculto, que exista y que permita la inserción.'
                  : 'No pudimos reproducir el video de YouTube. Intentá nuevamente.',
              );
            },
          },
        });
      })
      .catch(() => {
        if (active)
          setError(
            'No pudimos conectar con YouTube. Revisá tu conexión y los bloqueadores del navegador.',
          );
      });
    return () => {
      active = false;
      clearInterval(timer);
      // Capture the latest position before VideoPlayer flushes progress on unmount.
      if (player) {
        if (playerReady) {
          capture(player);
          callbacks.current.onPause();
        }
        player.destroy();
      }
    };
  }, [videoId, startTime, reload]);

  return (
    <div className="youtube-player">
      <div ref={hostRef} className="youtube-player-host" />
      {error && (
        <div className="player-placeholder youtube-player-error">
          <p role="alert">{error}</p>
          <button
            className="button-secondary text-xs"
            onClick={() => setReload((value) => value + 1)}
          >
            Volver a intentar
          </button>
        </div>
      )}
    </div>
  );
}
