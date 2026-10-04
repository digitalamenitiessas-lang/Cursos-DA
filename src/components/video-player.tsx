'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { Stream, type StreamPlayerApi } from '@cloudflare/stream-react';
import { Check, MonitorPlay, RefreshCw } from 'lucide-react';
import { YouTubePlayer } from './youtube-player';
export function VideoPlayer({
  lessonId,
  initialPosition = 0,
  initialCompleted = false,
  preview = false,
}: {
  lessonId: string;
  initialPosition?: number;
  initialCompleted?: boolean;
  preview?: boolean;
}) {
  const streamRef = useRef<StreamPlayerApi | undefined>(undefined);
  const position = useRef(initialPosition),
    lastSaved = useRef(0),
    completedRef = useRef(initialCompleted);
  const [completed, setCompleted] = useState(initialCompleted),
    [saving, setSaving] = useState(false),
    [saveError, setSaveError] = useState(''),
    [token, setToken] = useState(''),
    [youtubeId, setYoutubeId] = useState(''),
    [message, setMessage] = useState('Preparando tu clase…'),
    [reload, setReload] = useState(0);
  const resume = useRef(initialPosition);
  const [expiresAt, setExpiresAt] = useState(0);
  useEffect(() => {
    let active = true;
    fetch(`/api/lessons/${lessonId}/playback`, { method: 'POST' })
      .then(async (r) => {
        const d = await r.json();
        if (!active) return;
        if (!r.ok || d.status !== 'ready') {
          setToken('');
          setYoutubeId('');
          setExpiresAt(0);
          setMessage(d.message || d.error || 'El video está temporalmente no disponible.');
          return;
        }
        resume.current = position.current;
        setYoutubeId(d.provider === 'youtube' ? d.videoId : '');
        setToken(d.provider === 'youtube' ? '' : d.token);
        setExpiresAt(d.provider === 'youtube' ? 0 : d.expiresAt);
      })
      .catch(() => {
        if (active) setMessage('No pudimos conectar con el reproductor. Intentá nuevamente.');
      });
    return () => {
      active = false;
    };
  }, [lessonId, reload]);
  useEffect(() => {
    if (!expiresAt) return;
    const timeout = setTimeout(
      () => setReload((r) => r + 1),
      Math.max(1000, expiresAt * 1000 - Date.now() - 60000),
    );
    return () => clearTimeout(timeout);
  }, [expiresAt]);
  const save = useCallback(
    async (markComplete?: boolean) => {
      if (preview) return true;
      try {
        const response = await fetch(`/api/lessons/${lessonId}/progress`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            positionSeconds: Math.floor(position.current),
            ...(markComplete !== undefined ? { completed: markComplete } : {}),
          }),
          keepalive: true,
        });
        if (!response.ok) throw new Error();
        setSaveError('');
        return true;
      } catch {
        setSaveError('No pudimos guardar tu progreso. Comprobá tu conexión.');
        return false;
      }
    },
    [lessonId, preview],
  );
  useEffect(() => {
    const flush = () => {
      if (document.visibilityState === 'hidden') void save();
    };
    document.addEventListener('visibilitychange', flush);
    return () => {
      document.removeEventListener('visibilitychange', flush);
      void save();
    };
  }, [save]);
  async function complete() {
    setSaving(true);
    if (await save(true)) {
      completedRef.current = true;
      setCompleted(true);
    }
    setSaving(false);
  }
  function timeUpdate(seconds: number) {
    position.current = seconds;
    if (Date.now() - lastSaved.current > 15000) {
      lastSaved.current = Date.now();
      void save();
    }
  }
  return (
    <>
      <div className="classroom-player">
        {youtubeId ? (
          <YouTubePlayer
            key={youtubeId}
            videoId={youtubeId}
            startTime={resume.current}
            onTimeUpdate={timeUpdate}
            onPause={() => void save()}
            onEnded={() => void complete()}
          />
        ) : token ? (
          <Stream
            key={token}
            streamRef={streamRef}
            src={token}
            controls
            startTime={resume.current}
            primaryColor="#a18aff"
            title="Reproductor de la clase"
            onTimeUpdate={() => {
              timeUpdate(streamRef.current?.currentTime ?? position.current);
            }}
            onPause={() => void save()}
            onEnded={() => void complete()}
          />
        ) : (
          <div className="player-placeholder">
            <MonitorPlay size={34} />
            <p role="status">{message}</p>
            <button className="button-secondary text-xs" onClick={() => setReload((r) => r + 1)}>
              <RefreshCw size={14} />
              Volver a intentar
            </button>
          </div>
        )}
      </div>
      {!preview && (
        <div className="mt-5 flex flex-wrap gap-3 items-center">
          <button
            className="button-secondary"
            disabled={saving || completed}
            onClick={() => void complete()}
          >
            <Check size={16} />
            {completed ? 'Clase completada' : saving ? 'Guardando…' : 'Marcar como completada'}
          </button>
          <span className="text-xs muted">Tu posición se guarda mientras aprendés.</span>
          {saveError && (
            <p className="notice error-notice w-full" role="alert">
              {saveError}
            </p>
          )}
        </div>
      )}
    </>
  );
}
