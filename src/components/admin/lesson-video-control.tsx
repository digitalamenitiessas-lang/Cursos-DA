'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Play, Link2 } from 'lucide-react';
import { parseYouTubeVideoId, readVideoSource } from '@/lib/media/video-source';
import { VideoPlayer } from '@/components/video-player';
import { UploadControl } from './upload-control';

export function LessonVideoControl({
  lessonId,
  initialVideo,
  preview = false,
}: {
  lessonId: string;
  initialVideo?: { stream_uid: string; status: string };
  preview?: boolean;
}) {
  const router = useRouter();
  const source = initialVideo ? readVideoSource(initialVideo.stream_uid, lessonId) : null;
  const [url, setUrl] = useState(
    source?.provider === 'youtube' ? `https://www.youtube.com/watch?v=${source.videoId}` : '',
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFailed(false);
    setMessage('');
    const videoId = parseYouTubeVideoId(url);
    if (!videoId) {
      setFailed(true);
      setMessage('Pegá un enlace válido a un video de YouTube.');
      return;
    }
    if (preview) {
      setMessage('Vista de diseño: ingresá como administrador para guardar el video.');
      return;
    }
    const replacing = source && (source.provider !== 'youtube' || source.videoId !== videoId);
    if (
      replacing &&
      !window.confirm('¿Reemplazar el video actual de esta clase por este enlace de YouTube?')
    )
      return;
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/videos/${lessonId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No pudimos guardar el video.');
      setMessage('Enlace guardado. Probá la vista previa para comprobar la reproducción.');
      setShowPlayer(false);
      router.refresh();
    } catch (error) {
      setFailed(true);
      setMessage(error instanceof Error ? error.message : 'No pudimos guardar el video.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={save} className="studio-upload space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-slate-200">Video de la clase · YouTube</p>
          {source?.provider === 'youtube' && <span className="badge">Enlace guardado</span>}
        </div>
        <label className="field">
          <span className="field-label">Enlace del video</span>
          <input
            className="input"
            type="text"
            inputMode="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            required
            maxLength={2048}
            disabled={busy}
            placeholder="https://www.youtube.com/watch?v=…"
            autoComplete="off"
          />
        </label>
        <p className="text-xs leading-relaxed text-slate-400">
          Subí el video a tu canal como oculto (no listado) y permití la inserción. Quien obtenga el
          enlace podrá verlo fuera del aula; YouTube no lo limita a este sitio.
        </p>
        <button className="button-secondary text-xs" disabled={busy}>
          <Link2 size={15} /> {busy ? 'Guardando…' : 'Guardar video de YouTube'}
        </button>
        {message && (
          <p
            role={failed ? 'alert' : 'status'}
            className={failed ? 'notice error-notice' : 'notice'}
          >
            {message}
          </p>
        )}
      </form>
      {initialVideo && !preview && (
        <div className="space-y-3">
          <button
            type="button"
            className="button-secondary text-xs"
            onClick={() => setShowPlayer(!showPlayer)}
          >
            <Play size={15} /> {showPlayer ? 'Cerrar vista previa' : 'Probar video guardado'}
          </button>
          {showPlayer && <VideoPlayer key={initialVideo.stream_uid} lessonId={lessonId} preview />}
        </div>
      )}
      <details className="rounded-xl border border-white/10 p-4">
        <summary className="cursor-pointer text-xs text-slate-400">
          Alternativa: subir un archivo a Cloudflare Stream
          {source?.provider === 'cloudflare' ? ' · video actual' : ''}
        </summary>
        <div className="mt-4">
          <UploadControl
            key={initialVideo?.stream_uid || 'empty'}
            kind="video"
            lessonId={lessonId}
            initialStatus={initialVideo?.status}
            preview={preview}
          />
        </div>
      </details>
    </div>
  );
}
